(() => {
  const CONFIG = {
    githubJSON: "https://cdn.jsdelivr.net/gh/RuanGadea/auditoriox-locais@main/auditoriox-starter/data/locais.json",
    siteBase: "https://www.auditoriox.com"
  };

  // Utilidades de SEO
  function setMeta(name, content) {
    if (!content) return;
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setOG(prop, content) {
    if (!content) return;
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', prop);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setCanonical(href) {
    if (!href) return;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = href;
  }

  function addJSONLD(obj) {
    if (!obj) return;
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.text = JSON.stringify(obj);
    document.head.appendChild(s);
  }

  // Hidrata a página com os dados do local
  function hydrate(d) {
    // 1) SEO (client-side)
    document.title = d.seo_title || `${d.nome} | AuditórioX`;
    setMeta('description', d.seo_description || '');

    setOG('og:title', d.seo_title || d.nome || '');
    setOG('og:description', d.seo_description || '');
    const ogImg = (d.og_image || '').split('|').map(s => s.trim()).filter(Boolean)[0] || d.og_image || '';
    setOG('og:image', ogImg);
    setOG('og:type', 'website');
    setOG('og:url', `${CONFIG.siteBase}/locais/${d.slug}`);

    setMeta('twitter:card', 'summary_large_image');
    setCanonical(`${CONFIG.siteBase}/locais/${d.slug}`);

    // 2) Campos visuais
    document.querySelectorAll('[data-field]').forEach(el => {
      const key = el.dataset.field;
      if (!key) return;

      if (key === 'fotos' && d.fotos) {
        const imgs = d.fotos.split('|').map(u => u.trim()).filter(Boolean);
        el.innerHTML = imgs
          .map(u => `<img src="${u}" alt="${escapeHTML(d.nome || 'Foto')}" loading="lazy">`)
          .join('');
        return;
      }

      if (key === 'amenities' && d.amenities) {
        el.innerHTML = d.amenities
          .split(',')
          .map(a => `<li>${escapeHTML(a.trim())}</li>`)
          .join('');
        return;
      }

      const value = d[key];
      if (el.tagName === 'IMG') {
        if (value) el.setAttribute('src', value);
      } else {
        el.textContent = value || '';
      }
    });

    // 3) Ações/CTAs
    const qs = sel => document.querySelector(sel);

    const book = qs('[data-action="book"]');
    if (book) {
      if (d.simplybook_url) {
        book.href = d.simplybook_url;
      } else if (d.simplybook_service_id && d.simplybook_company_url) {
        book.href = `${d.simplybook_company_url.replace(/\/+$/,'')}/v2/#book/service/${d.simplybook_service_id}`;
      }
    }

    const pay = qs('[data-action="pay"]');
    if (pay && d.infinitepay_url) {
      pay.href = d.infinitepay_url;
    }

    const whats = qs('[data-action="whats"]');
    if (whats && d.whatsapp) {
      const digits = String(d.whatsapp).replace(/\D/g, '');
      if (digits) whats.href = `https://wa.me/${digits}`;
    }

    // 4) JSON-LD LocalBusiness
    const imagesForLd = (d.og_image || '')
      .split('|')
      .map(s => s.trim())
      .filter(Boolean);

    addJSONLD({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": d.nome,
      "url": `${CONFIG.siteBase}/locais/${d.slug}`,
      "image": imagesForLd.length ? imagesForLd : undefined,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": d.endereco,
        "addressLocality": d.cidade,
        "addressRegion": d.uf,
        "postalCode": d.cep,
        "addressCountry": "BR"
      },
      "geo": (d.lat && d.lng) ? {
        "@type": "GeoCoordinates",
        "latitude": +d.lat,
        "longitude": +d.lng
      } : undefined,
      "telephone": d.whatsapp || undefined,
      "priceRange": d.preco_min ? `R$ ${d.preco_min}+` : undefined,
      "amenityFeature": (d.amenities || '')
        .split(',')
        .filter(Boolean)
        .map(a => ({
          "@type": "LocationFeatureSpecification",
          "name": a.trim()
        }))
    });

    // 5) Expor o objeto e disparar evento para listeners externos (fotos individuais, SimplyBook, etc.)
    window.AX_DATA = d;
    document.dispatchEvent(new CustomEvent('ax:hydrated', { detail: d }));
  }

  function show404() {
    const c = document.querySelector('[data-when="notfound"]');
    if (c) c.style.display = 'block';
  }

  function getSlug() {
    const params = new URLSearchParams(location.search);
    const fromQuery = (params.get('l') || '').toLowerCase();
    if (fromQuery) return fromQuery;
    const seg = location.pathname.split('/').filter(Boolean).pop();
    return (seg || '').toLowerCase();
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, m => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('JSON not reachable');
    return res.json();
  }

  async function run() {
    const slug = getSlug();
    if (!slug) { show404(); return; }

    let dataList = null;
    try {
      if (CONFIG.githubJSON) {
        dataList = await fetchJSON(CONFIG.githubJSON);
      }
    } catch (err) {
      console.warn('Falha ao buscar JSON do GitHub/jsDelivr:', err);
    }

    if (!Array.isArray(dataList)) { show404(); return; }

    const d = dataList.find(x => (x.slug || '').toLowerCase() === slug);
    if (d) hydrate(d);
    else show404();
  }

  if (document.readyState !== 'loading') run();
  else document.addEventListener('DOMContentLoaded', run);
})();