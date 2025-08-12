export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const m = url.pathname.match(/^\/locais\/([^\/]+)\/?$/);
    if (!m) return fetch(request);

    const slug = m[1].toLowerCase();
    // 1) data source
    const dataRes = await fetch(env.DATA_JSON_URL); // e.g., https://cdn.jsdelivr.net/gh/USER/REPO@v1/data/locais.json
    if (!dataRes.ok) return new Response('Data unavailable', { status: 502 });
    const lista = await dataRes.json();
    const d = lista.find(x => (x.slug || '').toLowerCase() === slug);
    if (!d) return new Response('Not found', { status: 404 });

    // 2) get base HTML
    const base = await fetch('https://www.auditoriox.com/pag-base');
    return new HTMLRewriter()
      .on('title', { element(e){ e.setInnerContent(d.seo_title || `${d.nome} | AuditórioX`); }})
      .on('head', { element(e){
        e.append(meta('description', d.seo_description || ''), { html: true });
        e.append(og('og:title', d.seo_title || d.nome || ''), { html: true });
        e.append(og('og:description', d.seo_description || ''), { html: true });
        e.append(og('og:image', d.og_image || ''), { html: true });
        e.append(og('og:type', 'website'), { html: true });
        e.append(og('og:url', `https://www.auditoriox.com/locais/${d.slug}`), { html: true });
        e.append(`<link rel="canonical" href="https://www.auditoriox.com/locais/${d.slug}">`, { html: true });
        e.append(`<script type="application/ld+json">${jsonld(d)}</script>`, { html: true });
      }})
      .transform(base);
  }
}

function meta(name, content){ return `<meta name="${esc(name)}" content="${esc(content)}">`; }
function og(prop, content){ return `<meta property="${esc(prop)}" content="${esc(content)}">`; }
function jsonld(d){
  return JSON.stringify({
    "@context":"https://schema.org",
    "@type":"LocalBusiness",
    "name": d.nome,
    "url": `https://www.auditoriox.com/locais/${d.slug}`,
    "image": (d.og_image||'').split('|').map(s=>s.trim()).filter(Boolean),
    "address": {"@type":"PostalAddress","streetAddress": d.endereco,"addressLocality": d.cidade,"addressRegion": d.uf,"postalCode": d.cep,"addressCountry":"BR"},
    "geo": (d.lat && d.lng) ? {"@type":"GeoCoordinates","latitude":+d.lat,"longitude":+d.lng} : undefined,
    "telephone": d.whatsapp || undefined,
    "priceRange": d.preco_min ? `R$ ${d.preco_min}+` : undefined,
    "amenityFeature": (d.amenities||'').split(',').filter(Boolean).map(a=>({"@type":"LocationFeatureSpecification","name":a.trim()}))
  });
}
function esc(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
