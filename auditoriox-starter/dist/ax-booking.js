(function(){
  var DEFAULT_PROVIDER = '2';
  var DEFAULT_COMPANY = 'https://auditoriox.simplybook.me';
  var DATA_URL = 'https://cdn.jsdelivr.net/gh/RuanGadea/auditoriox-locais@main/auditoriox-starter/data/locais.json';
  var CONTAINER_ID = 'sbWidgetContainer';
  var mounted = false;

  function ensureContainer(){
    var el = document.getElementById(CONTAINER_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    document.body.appendChild(el);
    return el;
  }

  function injectCssOnce(){
    if (document.getElementById('sb-css-once')) return;
    var st = document.createElement('style');
    st.id = 'sb-css-once';
    st.textContent = '.sb-widget-responsive iframe[src*="simplybook.me"]{width:100%!important;height:760px!important;border:0;display:block;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(62,90,209,.10)}';
    document.head.appendChild(st);
  }

  function loadSdk(cb){
    if (window.SimplybookWidget){ cb(); return; }
    var s = document.createElement('script');
    s.src = '//widget.simplybook.me/v2/widget/widget.js';
    s.async = true;
    s.onload = cb;
    document.head.appendChild(s);
  }

  function mount(company, service, provider){
    if (!company || !service) return;
    var cont = ensureContainer();
    injectCssOnce();
    cont.innerHTML = '';
    new SimplybookWidget({
      widget_type:'iframe',
      url: String(company).replace('simplybook.it','simplybook.me'),
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
          provider:String(provider || DEFAULT_PROVIDER),
          service:String(service)
        }
      },
      container_id: CONTAINER_ID
    });
    mounted = true;
  }

  function tryFromAX(){
    var d = window.AX_DATA || null;
    if (!d) return false;
    var svc = d.simplybook_service_id;
    var comp = d.simplybook_company_url || DEFAULT_COMPANY;
    var prv = d.simplybook_provider_id || DEFAULT_PROVIDER;
    if (!svc || !comp) return false;
    loadSdk(function(){ mount(comp, svc, prv); });
    var cta = document.querySelector('[data-action="book"]');
    if (cta && !cta._sbBound){
      cta._sbBound = true;
      cta.addEventListener('click', function(e){
        e.preventDefault();
        var box = ensureContainer();
        if (box && box.scrollIntoView) box.scrollIntoView({ behavior:'smooth', block:'start' });
      });
    }
    return true;
  }

  function getSlug(){
    try{
      var u = new URL(location.href);
      var q = (u.searchParams.get('l') || '').trim().toLowerCase();
      if (q) return q;
      var m = u.pathname.match(/\/locais\/([^\/?#]+)\/?$/i);
      if (m && m[1]) return m[1].toLowerCase();
    }catch(e){}
    return '';
  }

  function tryFromJson(){
    var slug = getSlug();
    if (!slug) return;
    fetch(DATA_URL, { cache:'no-store' })
      .then(function(r){ if(!r.ok) throw new Error('http '+r.status); return r.json(); })
      .then(function(list){
        if (!list || !list.length) return;
        var i, d = null;
        for(i=0;i<list.length;i++){
          var it = list[i];
          if ((it.slug || '').toLowerCase() === slug){ d = it; break; }
        }
        if (!d) return;
        var svc = d.simplybook_service_id;
        var comp = d.simplybook_company_url || DEFAULT_COMPANY;
        var prv = d.simplybook_provider_id || DEFAULT_PROVIDER;
        if (!svc || !comp) return;
        loadSdk(function(){ mount(comp, svc, prv); });
      })
      .catch(function(){});
  }

  document.addEventListener('ax:hydrated', function(){ tryFromAX(); }, { once:true });

  function kickoff(){
    if (!tryFromAX()){
      setTimeout(function(){ if (!mounted) tryFromJson(); }, 2000);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kickoff);
  else kickoff();

  window.AX_BOOKING_FORCE = function(payload){
    if (!payload) return;
    var comp = payload.simplybook_company_url || DEFAULT_COMPANY;
    var svc = payload.simplybook_service_id;
    var prv = payload.simplybook_provider_id || DEFAULT_PROVIDER;
    if (!svc || !comp) return;
    loadSdk(function(){ mount(comp, svc, prv); });
  };
})();
