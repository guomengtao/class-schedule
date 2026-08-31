var PRODUCTS = {
  '0001': { name: 'EV Schedule', icon: '📚' },
  '9999': { name: 'All-Product Pass', icon: '🌟' }
}

function getProduct(id) {
  return PRODUCTS[id] || null
}

function getProductName(id) {
  var p = PRODUCTS[id]
  return p ? p.name : 'Unknown Product'
}

function getAllProducts() {
  return PRODUCTS
}

module.exports = {
  PRODUCTS: PRODUCTS,
  getProduct: getProduct,
  getProductName: getProductName,
  getAllProducts: getAllProducts
}