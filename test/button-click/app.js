console.log('this is app.js');
function add(a, b) {
  return a + b;
}

console.log('2 + 3 =', add(2, 3));

function onButtonClick() {
  console.log('button clicked');
  alert('Thank you for clicking the button');
}

document.addEventListener('DOMContentLoaded', function(){
  document.querySelector('#btn').addEventListener('click', onButtonClick);
});
