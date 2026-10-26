// Activa la hoja de Google Fonts que el <head> pide como "print" para no bloquear el primer pintado.
(function () {
  var hoja = document.getElementById("hoja-fuentes");
  if (!hoja) return;
  var activar = function () { hoja.media = "all"; };
  if (hoja.sheet) activar();
  else hoja.addEventListener("load", activar);
})();
