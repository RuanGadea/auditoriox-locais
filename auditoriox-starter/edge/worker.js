export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Suporta /locais/<slug> e /pag-base?l=<slug>
    let slug = null;
    if (/^\/locais\//.test(url.pathname)) {
      const m = url.pathname.match(/^\/locais\/([^\/]+)\/?$/);
      if (!m) return fetch(request);
      slug = (m[1] || '').toLowerCase();
    } else if (url.pathname === '/pag-base' && url.searchParams.get('l')) {
      slug = (url.searchParams.get('l') || '').toLowerCase();
    } else {
      // Fora das rotas de locais → segue normal
      return fetch(request);
    }

    // 1) Fonte de dados (JSON de locais)
    const dataRes = await fetch(env.DATA_JSON_URL, { cf: { cacheTtl: 180, cacheEverything: true } });
    if (!dataRes.ok) return new Response('Data unavailable', { status: 502 });
    const lista = await dataRes.json();
    const d = lista.find(x => (x.slug || '').toLowerCase() === slug);
    if (!d) return new Response('Not found', { status: 404 });

    // 2) Base HTML (sua página de template)
    const base = await fetch('https://www.auditoriox.com/pag-base', { cf: { cacheTtl: 60, cacheEverything: true } });

    // 3) Objetos e snippets a injetar
    const CURRENT_LOCAL = {
      slug: d.slug,
      simplybook_company_url: (d.simplybook_company_url || 'https://auditoriox.simplybook.me').replace('simplybook.it','simplybook.me'),
      simplybook_service_id: Number(d.simplybook_service_id),
      simplybook_provider_id: d.simplybook_provider_id ? Number(d.simplybook_provider_id) : 2
    };

    const CURRENT_LOCAL_SCRIPT =
      `<script>window.CURRENT_LOCAL = ${safeJson(CURRENT_LOCAL)};</script>`;

    const WIDGET_CONTAINER =
      `<div class="sb-widget-blurbox" id="sbWidgetBlurbox">
        <div class="sb-widget-responsive">
          <div id="sbWidgetContainer"></div>
          <div class="glass-blur-widget" id="glassBlurWidget"></div>
        </div>
      </div>`;

    const WIDGET_BOOTSTRAP =
      `<script>(function(){
        var CID='sbWidgetContainer', DEFAULT_PROVIDER='2';
        function loadSDK(cb){
          if (window.SimplybookWidget) { cb(); return; }
          var s=document.createElement('script');
          s.src='//widget.simplybook.me/v2/widget/widget.js';
          s.async=true; s.onload=cb; document.head.appendChild(s);
        }
        function mount(cfg){
          if(!cfg || !cfg.companyUrl || !cfg.service) return;
          var container=document.getElementById(CID);
          if(!container) return;
          container.innerHTML='';
          new SimplybookWidget({
            widget_type:'iframe',
            url: cfg.companyUrl,
            theme:'space',
            theme_settings:{
              timeline_hide_unavailable:'1',
              sb_base_color:'#3e5ad1',
              hide_past_days:'0',
              timeline_show_end_time:'0',
              timeline_modern_display:'as_slots',
              display_item_mode:'list',
              body_bg_color:'#ffffff',
              sb_review_image:'13',
              sb_review_image_preview:'/uploads/auditoriox/image_files/preview/cd6ff201fd4fe5f72660d1aa2e4a4ba4.png',
              dark_font_color:'#040846',
              light_font_color:'#ffffff',
              btn_color_1:'#3e5ad1',
              sb_company_label_color:'#ffffff',
              hide_img_mode:'0',
              show_sidebar:'1',
              sb_busy:'#e02a2a',
              sb_available:'#d6ebff'
            },
            timeline:'modern',
            datepicker:'top_calendar',
            is_rtl:false,
            app_config:{
              clear_session:1,
              allow_switch_to_ada:0,
              predefined:{
                provider:String(cfg.provider || DEFAULT_PROVIDER),
                service:String(cfg.service)
              }
            },
            container_id: CID
          });
        }
        function confFromWindow(){
          var L = window.CURRENT_LOCAL || {};
          return {
            companyUrl: String(L.simplybook_company_url || 'https://auditoriox.simplybook.me').replace('simplybook.it','simplybook.me'),
            service: String(L.simplybook_service_id || ''),
            provider: String(L.simplybook_provider_id || DEFAULT_PROVIDER)
          };
        }
        function init(){ var cfg=confFromWindow(); loadSDK(function(){ mount(cfg); }); }
        window.setSimplybookFromLocal = function(L){ if(!L) return; window.CURRENT_LOCAL = L; init(); };
        if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
      })();</script>`;

    // 4) Reescrita do HTML
    let foundContainer = false;
    const rewritten = new HTMLRewriter()
      // SEO/metas
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
        // Exporta CURRENT_LOCAL para o front
        e.append(CURRENT_LOCAL_SCRIPT, { html: true });
      }})
      // Garante o container correto (substitui se já existir)
      .on('div#sbWidgetBlurbox', {
        element(e){ foundContainer = true; e.setInnerContent(WIDGET_CONTAINER, { html: true }); }
      })
      // Final da página: injeta bootstrap do widget e, se não havia container, adiciona um no fim do body
      .on('body', { element(e){
        if (!foundContainer) e.append(WIDGET_CONTAINER, { html: true });
        e.append(WIDGET_BOOTSTRAP, { html: true });
      }})
      .transform(base);

    return rewritten;
  }
};

// Helpers
function meta(name, content){ return `<meta name="${esc(name)}" content="${esc(content)}">`; }
function og(prop, content){ return `<meta property="${esc(prop)}" content="${esc(content)}">`; }
function jsonld(d){
  return JSON.stringify({
    "@context":"https://schema.org",
    "@type":"LocalBusiness",
    "name": d.nome,
