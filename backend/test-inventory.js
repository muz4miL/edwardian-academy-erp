async function test() {
  try {
    console.log('Testing inventory creation...');
    const res = await fetch('http://localhost:5001/api/inventory/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemName: 'Test Barcode Scanner',
        category: 'Electronics',
        totalQuantity: 3,
        purchasePrice: 9000,
        purchaseDate: '2026-03-01',
        assignedTo: 'Room 101',
        notes: 'Test item'
      })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    if (res.ok) {
      console.log('✅ Success! Item created:', data.data?.itemCode, data.data?.itemName);
    } else {
      console.log('❌ Error:', JSON.stringify(data, null, 2));
    }
  } catch(err) {
    console.log('❌ Request Error:', err.message);
  }
}

test();
