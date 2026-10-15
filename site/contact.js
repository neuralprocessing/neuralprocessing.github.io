// E-Mail liegt nur kodiert im HTML (Base64 eines umgedrehten Strings)
// und wird erst im Browser zum klickbaren Link.
function decode(s) {
    return atob(s).split('').reverse().join('');
}

document.querySelectorAll('a[data-e]').forEach(function(a) {
    var addr = decode(a.dataset.e);
    a.href = 'mailto:' + addr;
    a.textContent = addr;
});
