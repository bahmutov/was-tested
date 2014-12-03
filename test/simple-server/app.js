console.log('this is app.js');
function add(a, b) {
  return a + b;
}

console.log('2 + 3 =', add(2, 3));

function notTested() {
  console.log('this is not tested');
  throw new Error('omg');
}
