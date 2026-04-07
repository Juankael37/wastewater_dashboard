// Test frontend API call directly
const testMeasurement = {
  timestamp: new Date().toISOString(),
  ph: '7.2',
  cod: '45.0',
  bod: '25.0',
  tss: '35.0',
  ammonia: '0.3',
  nitrate: '8.0',
  phosphate: '0.5',
  temperature: '22.0',
  flow: '2500.0',
  type: 'effluent',
  plant_id: 1,
  notes: 'Test from frontend'
};

fetch('http://localhost:5000/api/measurements', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'session=test' // You'll need actual session cookie
  },
  body: JSON.stringify(testMeasurement)
})
.then(response => response.json())
.then(data => console.log('Success:', data))
.catch(error => console.error('Error:', error));
