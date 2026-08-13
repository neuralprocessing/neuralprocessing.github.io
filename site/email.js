document.querySelectorAll('a[data-u]').forEach(function(a) {
    var addr = a.dataset.u + '@' + a.dataset.d;
    a.href = 'mailto:' + addr;
    a.textContent = addr;
});