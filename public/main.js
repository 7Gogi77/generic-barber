// Production entry that loads the built hashed bundle
// This ensures pages that reference /main.js work in deployment without rewriting HTML.
(async function(){
  try {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = '/assets/main-CgMe8HQj.js';
    document.head.appendChild(s);
    console.log('Loaded production main bundle');
  } catch (e) {
    console.error('Failed to load production main bundle', e);
  }
})();