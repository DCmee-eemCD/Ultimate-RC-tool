globalThis.RC={ready:Promise.resolve(),workerOptions:{
  workerPath:chrome.runtime.getURL('vendor/worker.min.js'),corePath:chrome.runtime.getURL('vendor/core/'),
  langPath:chrome.runtime.getURL('vendor/lang/'),workerBlobURL:false,gzip:true
}};
