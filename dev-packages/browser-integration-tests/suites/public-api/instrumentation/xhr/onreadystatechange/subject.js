window.calls = {};
const xhr = new XMLHttpRequest();
xhr.open('GET', 'test');
xhr.onreadystatechange = function wat() {
  window.calls[xhr.readyState] = window.calls[xhr.readyState] ? window.calls[xhr.readyState] + 1 : 1;
};
xhr.send();
