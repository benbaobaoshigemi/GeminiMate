import"./modulepreload-polyfill-B5Qt9EMX.js";const i=document.getElementById("preview");if(i instanceof HTMLIFrameElement){const r=t=>/<base\s/i.test(t)?t:t.replace(/<head([^>]*)>/i,`<head$1><base href="${location.href}">`),a=t=>{const e=String(t||"").trim();return e?/<\s*(?:!doctype|html|head|body)\b/i.test(e)?r(e):`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <base href="${location.href}">
  </head>
  <body>${e}</body>
</html>`:""};window.addEventListener("message",t=>{if(t.data?.type!=="PREVIEW_HTML")return;const e=a(t.data.html||"");e&&(document.title=typeof t.data.title=="string"&&t.data.title.trim()?t.data.title.trim():"GeminiMate Preview Runner",i.srcdoc=e)});try{window.opener?.postMessage({type:"RUNNER_READY"},"*")}catch{}}
