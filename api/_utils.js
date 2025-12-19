export function allowMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.statusCode = 405;
    res.setHeader("Allow", methods.join(", "));
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return false;
  }
  return true;
}

export async function parseJson(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString();
  return raw ? JSON.parse(raw) : {};
}

export function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function normalizeId(id = "") {
  return id.trim();
}

export function normalizeGroupId(id = "") {
  return id.trim().toUpperCase();
}

export function normalizePhone(phone = "") {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  // Keep leading + and digits only
  const cleaned = trimmed.replace(/(?!^\+)[^\d]/g, "");
  return cleaned;
}

export function generateGroupId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i += 1) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
