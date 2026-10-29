// Read the selected COL document in bounded byte ranges; never use another copy.
export function cataloguePDFURL(raw) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.hostname !== "media.col.org.il" || url.port || url.username || url.password ||
      !url.pathname.startsWith("/files/uploads/original/") || !/\.pdf$/i.test(url.pathname)) throw Error("Invalid catalogue PDF URL");
  url.hash = ""; return url.href;
}
async function bytes(response, limit) {
  if (Number(response.headers.get("content-length")) > limit) { await response.body?.cancel(); throw Error("PDF byte limit"); }
  const reader = response.body.getReader(), chunks = []; let size = 0;
  try {
    for (;;) { const {done,value} = await reader.read(); if (done) break; size += value.length;
      if (size > limit) throw Error("PDF byte limit"); chunks.push(value); }
  } catch (error) { await reader.cancel().catch(()=>{}); throw error; }
  const out = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; } return out;
}
function retryableFetchError(reason) {
  return reason instanceof TypeError || /(?:fetch failed|terminated|ECONNRESET|UND_ERR_SOCKET)/i.test(String(reason?.message || reason));
}
function delay(ms, signal) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(done, ms);
    const aborted = () => { cleanup(); reject(signal.reason instanceof Error ? signal.reason : Error("PDF transport canceled")); };
    function cleanup() { clearTimeout(timer); signal.removeEventListener("abort", aborted); }
    function done() { cleanup(); resolve(); }
    signal.addEventListener("abort", aborted, {once:true});
  });
}
async function retryTransient(operation, {retries, retryDelay, signal}) {
  for (let attempt = 0;; attempt++) {
    try { return await operation(); }
    catch (reason) {
      if (signal.aborted || attempt >= retries || !retryableFetchError(reason)) throw reason;
      await delay(retryDelay * (attempt + 1), signal);
    }
  }
}
export async function openCataloguePDF(raw, lib, {fetchImpl=fetch, limit=72*1024*1024, timeout=45000, retries=2, retryDelay=500}={}) {
  if (!Number.isSafeInteger(retries) || retries < 0 || retries > 4 || !Number.isSafeInteger(retryDelay) || retryDelay < 0 || retryDelay > 5000) throw Error("Invalid PDF retry policy");
  const url = cataloguePDFURL(raw), controller = new AbortController(); let rejectError, closed=false, spent=0, requests=0;
  const error = new Promise((_, reject)=>{rejectError=reject;}); error.catch(()=>{});
  const fail = reason => { if (!closed) { rejectError(reason); controller.abort(); } };
  const timer = setTimeout(()=>fail(Error("PDF range timeout")),timeout);
  const close = () => { closed=true; clearTimeout(timer); controller.abort(); };
  const request = (begin,end) => fetchImpl(url,{signal:controller.signal,redirect:"error",headers:{Accept:"application/pdf",Range:"bytes="+begin+"-"+(end-1)}});
  try {
    const firstResult = await retryTransient(async()=>{
      const response = await request(0,65536);
      const data = response.status === 200 ? await bytes(response,limit) : response.status === 206 ? await bytes(response,65536) : undefined;
      return {response,data};
    },{retries,retryDelay,signal:controller.signal});
    const first = firstResult.response;
    if (first.status === 200) {
      const data = firstResult.data;
      if (new TextDecoder().decode(data.subarray(0,5)) !== "%PDF-") throw Error("Invalid PDF signature");
      return {options:{data},error,close};
    }
    const match = /^bytes 0-([0-9]+)\/([0-9]+)$/.exec(first.headers.get("content-range")||"");
    if (first.status !== 206 || !match) throw Error("Invalid initial PDF range");
    const total = Number(match[2]), end = Number(match[1])+1;
    if (!Number.isSafeInteger(total) || total < 5 || total > 512*1024*1024 || end !== Math.min(65536,total)) throw Error("Invalid PDF range length");
    const initial = firstResult.data;
    if (initial.length !== end || new TextDecoder().decode(initial.subarray(0,5)) !== "%PDF-") throw Error("Invalid PDF range data");
    spent = initial.length;
    class Transport extends lib.PDFDataRangeTransport {
      requestDataRange(begin,end) {
        if (closed) return;
        if (!Number.isInteger(begin) || !Number.isInteger(end) || begin < 0 || end <= begin || end > total ||
            ++requests > 512 || (spent += end-begin) > limit) { fail(Error("PDF range budget")); return; }
        void (async()=>{
          const expected = "bytes "+begin+"-"+(end-1)+"/"+total;
          const data = await retryTransient(async()=>{
            const response = await request(begin,end);
            if (response.status !== 206 || response.headers.get("content-range") !== expected) throw Error("Misaligned PDF range");
            const chunk = await bytes(response,end-begin);
            if (chunk.length !== end-begin) throw Error("Incomplete PDF range");
            return chunk;
          },{retries,retryDelay,signal:controller.signal});
          if (!closed) this.onDataRange(begin,data);
        })().catch(fail);
      }
      abort() { fail(Error("PDF transport canceled")); }
    }
    return {options:{range:new Transport(total,initial,true),rangeChunkSize:262144,disableAutoFetch:true,disableStream:true},error,close};
  } catch (reason) { close(); throw reason; }
}

