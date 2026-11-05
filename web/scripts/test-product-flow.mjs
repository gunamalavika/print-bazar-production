import assert from 'assert';

async function runTests() {
  console.log('--- STARTING THREE-STEP CUSTOMIZATION FLOW E2E TESTS ---');

  // Test 1: Product Resolution
  console.log('Test 1: Resolving business-cards product via API...');
  const prodRes = await fetch('http://localhost:4000/api/v1/products/business-cards');
  assert.strictEqual(prodRes.status, 200, 'Product endpoint must return 200');
  const product = await prodRes.json();
  assert.ok(product.id, 'Product must have an id');
  assert.ok(product.optionGroups?.length > 0, 'Product must have configured optionGroups');
  console.log('✓ Product resolved successfully:', product.name, `(${product.optionGroups.length} option groups)`);

  // Test 2: Authoritative Pricing Quote for Step 1
  console.log('\nTest 2: Recalculating authoritative quote with options and quantity...');
  const quotePayload = {
    productId: product.id,
    quantity: 100,
    options: [
      { optionCode: 'paper_type', valueCode: 'matte' },
      { optionCode: 'cutting_style', valueCode: 'square' },
      { optionCode: 'lamination', valueCode: 'none' },
      { optionCode: 'print_location', valueCode: 'front' }
    ],
    fieldValues: {
      paper_type: 'matte',
      cutting_style: 'square',
      lamination: 'none',
      print_location: 'front'
    },
    hasArtwork: true,
    hasDesignService: false,
    deliveryMethod: 'COURIER',
    paymentMethod: 'ONLINE'
  };

  const quoteRes = await fetch('http://localhost:4000/api/v1/pricing/calculate-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quotePayload)
  });
  assert.strictEqual(quoteRes.status, 200, 'Pricing quote endpoint must return 200');
  const quote = await quoteRes.json();
  assert.ok(quote.subtotal > 0, 'Subtotal must be positive');
  assert.ok(quote.totalTax > 0, 'Total tax (GST 18%) must be calculated');
  assert.ok(quote.grandTotal >= quote.subtotal + quote.totalTax, 'Grand total must reconcile');
  console.log('✓ Pricing quote verified: Subtotal = ₹' + quote.subtotal + ', Tax = ₹' + quote.totalTax + ', Grand Total = ₹' + quote.grandTotal);

  // Test 3: Design Assistance Price Modifier (Step 2 Option B)
  console.log('\nTest 3: Testing Design Assistance Service pricing impact...');
  const designQuotePayload = { ...quotePayload, hasDesignService: true };
  const designRes = await fetch('http://localhost:4000/api/v1/pricing/calculate-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(designQuotePayload)
  });
  assert.strictEqual(designRes.status, 200, 'Design assistance quote must return 200');
  const designQuote = await designRes.json();
  assert.ok(designQuote.grandTotal >= quote.grandTotal, 'Design quote must be equal or higher due to studio assistance fee');
  console.log('✓ Design assistance pricing calculated correctly: Base = ₹' + quote.grandTotal + ', With Studio = ₹' + designQuote.grandTotal);

  // Test 4: Higher Quantity Tier Pricing Recalculation
  console.log('\nTest 4: Testing Quantity Tier Volume Scaling (500 pcs)...');
  const volumePayload = { ...quotePayload, quantity: 500 };
  const volumeRes = await fetch('http://localhost:4000/api/v1/pricing/calculate-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(volumePayload)
  });
  assert.strictEqual(volumeRes.status, 200, 'Volume quote must return 200');
  const volumeQuote = await volumeRes.json();
  assert.ok(volumeQuote.subtotal > quote.subtotal, '500 pcs subtotal must be greater than 100 pcs subtotal');
  console.log('✓ Quantity scaling verified: 100 pcs = ₹' + quote.subtotal + ' vs 500 pcs = ₹' + volumeQuote.subtotal);

  // Test 5: Next.js Frontend Page Route & Layout Availability
  console.log('\nTest 5: Verifying Storefront Route /products/business-cards...');
  const pageRes = await fetch('http://localhost:3000/products/business-cards');
  assert.strictEqual(pageRes.status, 200, 'Storefront product page must return 200');
  const pageHtml = await pageRes.text();
  assert.ok(pageHtml.includes('PRINT BAZZAR'), 'Page must contain PRINT BAZZAR brand');
  console.log('✓ Storefront route /products/business-cards renders with 200 OK');

  console.log('\n======================================================');
  console.log('ALL THREE-STEP PRODUCT CUSTOMIZATION FLOW TESTS PASSED');
  console.log('======================================================');
}

runTests().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
