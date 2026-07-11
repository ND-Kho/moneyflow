import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AZURE_API_VERSION = "2024-11-30";
const MAX_POLL_ATTEMPTS = 20;

type AzureField = {
  content?: string;
  confidence?: number;
  valueString?: string;
  valueDate?: string;
  valueCurrency?: { amount?: number; currencyCode?: string };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEndpoint(endpoint: string) {
  return endpoint.trim().replace(/\/+$/, "");
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function fieldText(field?: AzureField) {
  const value = field?.valueString || field?.content;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function inferCategory(text: string) {
  const normalized = text.toLocaleLowerCase("vi");
  const rules: Array<[string, string[]]> = [
    ["Ăn uống", ["restaurant", "coffee", "cafe", "cà phê", "trà sữa", "food", "mart", "siêu thị", "quán", "phở", "cơm", "bánh"]],
    ["Di chuyển", ["grab", "be ", "taxi", "xăng", "petrol", "parking", "vé xe", "vietnam airlines", "vietjet"]],
    ["Học tập", ["school", "university", "trường", "học phí", "nhà sách", "book"]],
    ["Giải trí", ["cinema", "movie", "cgv", "lotte cinema", "game", "karaoke"]],
    ["Mua sắm", ["shop", "store", "fashion", "clothing", "shopee", "lazada", "tiki"]],
    ["Hóa đơn", ["electric", "water", "internet", "điện lực", "tiền điện", "tiền nước", "viễn thông"]],
  ];

  return rules.find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[0] || "Khác";
}

function azureErrorMessage(status: number) {
  if (status === 401 || status === 403) {
    return "Azure OCR từ chối xác thực. Hãy kiểm tra endpoint và API key.";
  }

  if (status === 429) {
    return "Đã hết hạn mức OCR miễn phí hoặc gửi quá nhiều yêu cầu. Vui lòng thử lại sau hoặc nhập thủ công.";
  }

  if (status === 400 || status === 413) {
    return "Azure OCR không thể đọc ảnh này. Hãy thử ảnh rõ hơn hoặc dung lượng nhỏ hơn.";
  }

  return "Dịch vụ Azure OCR đang gặp lỗi. Vui lòng thử lại.";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Bạn cần đăng nhập để sử dụng OCR." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const azureEndpoint = Deno.env.get("AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT");
  const azureApiKey = Deno.env.get("AZURE_DOCUMENT_INTELLIGENCE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !azureEndpoint || !azureApiKey) {
    return jsonResponse({ error: "Edge Function chưa được cấu hình đầy đủ Azure OCR." }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "Phiên đăng nhập không hợp lệ." }, 401);
  }

  let body: { image_data_url?: unknown };

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Dữ liệu gửi lên không hợp lệ." }, 400);
  }

  if (typeof body.image_data_url !== "string") {
    return jsonResponse({ error: "Thiếu ảnh hóa đơn." }, 400);
  }

  const imageMatch = body.image_data_url.match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/
  );

  if (!imageMatch || !ALLOWED_MIME_TYPES.includes(imageMatch[1])) {
    return jsonResponse({ error: "Chỉ chấp nhận ảnh JPG, PNG hoặc WebP." }, 400);
  }

  const estimatedBytes = Math.floor((imageMatch[2].length * 3) / 4);

  if (estimatedBytes <= 0 || estimatedBytes > MAX_IMAGE_BYTES) {
    return jsonResponse({ error: "Ảnh dùng OCR không được vượt quá 4 MB trên gói Azure F0." }, 400);
  }

  const analyzeUrl = `${normalizeEndpoint(azureEndpoint)}/documentintelligence/documentModels/prebuilt-receipt:analyze?api-version=${AZURE_API_VERSION}`;
  const analyzeResponse = await fetch(analyzeUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": azureApiKey,
      "Content-Type": imageMatch[1],
    },
    body: decodeBase64(imageMatch[2]),
  });

  if (!analyzeResponse.ok) {
    console.error("Azure OCR analyze error:", analyzeResponse.status, await analyzeResponse.text());
    return jsonResponse({ error: azureErrorMessage(analyzeResponse.status) }, 502);
  }

  const operationLocation = analyzeResponse.headers.get("operation-location");

  if (!operationLocation) {
    return jsonResponse({ error: "Azure OCR không trả về mã theo dõi kết quả." }, 502);
  }

  let analyzeResult: Record<string, unknown> | null = null;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    await wait(attempt < 4 ? 500 : 1000);
    const resultResponse = await fetch(operationLocation, {
      headers: { "Ocp-Apim-Subscription-Key": azureApiKey },
    });

    if (!resultResponse.ok) {
      console.error("Azure OCR result error:", resultResponse.status, await resultResponse.text());
      return jsonResponse({ error: azureErrorMessage(resultResponse.status) }, 502);
    }

    const result = await resultResponse.json();

    if (result.status === "succeeded") {
      analyzeResult = result;
      break;
    }

    if (result.status === "failed") {
      console.error("Azure OCR processing failed:", result.error);
      return jsonResponse({ error: "Azure OCR không thể xử lý hóa đơn này." }, 502);
    }
  }

  if (!analyzeResult) {
    return jsonResponse({ error: "Azure OCR xử lý quá lâu. Vui lòng thử lại." }, 504);
  }

  const azureAnalysis = (analyzeResult as {
    analyzeResult?: {
      content?: string;
      documents?: Array<{ fields?: Record<string, AzureField> }>;
    };
  }).analyzeResult;
  const document = azureAnalysis?.documents?.[0];
  const fields = document?.fields || {};
  const merchant = fieldText(fields.MerchantName);
  const date = fields.TransactionDate?.valueDate || fieldText(fields.TransactionDate);
  const amount = fields.Total?.valueCurrency?.amount ?? null;
  const currency = fields.Total?.valueCurrency?.currencyCode || fieldText(fields.TotalCurrencyCode);
  const confidenceValues = [fields.MerchantName, fields.TransactionDate, fields.Total]
    .map((field) => field?.confidence)
    .filter((value): value is number => typeof value === "number");
  const confidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : 0;
  const searchableText = [merchant, azureAnalysis?.content, fieldText(fields.MerchantAddress)]
    .filter(Boolean)
    .join(" ");

  return jsonResponse({
    receipt: {
      merchant,
      transaction_date: date,
      amount,
      currency,
      suggested_type: "expense",
      suggested_category: inferCategory(searchableText),
      note: merchant ? `Hóa đơn từ ${merchant}` : "Dữ liệu được đọc từ hóa đơn",
      confidence: Math.round(confidence * 1000) / 1000,
    },
  });
});
