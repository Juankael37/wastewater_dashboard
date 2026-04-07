from app.models import *
from datetime import datetime, timedelta
import random

# Get or create test user
user = User.get_by_username('admin')
if not user:
    user_id = User.create('admin', 'admin123')
    user = {'id': user_id}

# Add some sample measurements for the last few days
for days_ago in range(3, 0, -1):
    for hours in [8, 12, 16]:
        timestamp = datetime.now() - timedelta(days=days_ago, hours=hours)
        
        # Generate realistic values
        ph = round(random.uniform(6.5, 8.5), 1)
        cod = round(random.uniform(20, 80), 2)
        bod = round(random.uniform(10, 40), 2)
        tss = round(random.uniform(20, 90), 2)
        ammonia = round(random.uniform(0.1, 0.4), 3)
        nitrate = round(random.uniform(2, 12), 2)
        phosphate = round(random.uniform(0.2, 0.8), 3)
        temperature = round(random.uniform(15, 35), 1)
        flow = round(random.uniform(1000, 4000), 2)
        
        # Create both influent and effluent measurements
        for measurement_type in ['influent', 'effluent']:
            data = {
                'timestamp': timestamp.isoformat(),
                'ph': ph,
                'cod': cod * (0.7 if measurement_type == 'effluent' else 1),
                'bod': bod * (0.7 if measurement_type == 'effluent' else 1),
                'tss': tss * (0.7 if measurement_type == 'effluent' else 1),
                'ammonia': ammonia * (0.7 if measurement_type == 'effluent' else 1),
                'nitrate': nitrate * (0.7 if measurement_type == 'effluent' else 1),
                'phosphate': phosphate * (0.7 if measurement_type == 'effluent' else 1),
                'temperature': temperature,
                'flow': flow,
                'type': measurement_type,
                'plant_id': 1,
                'operator_id': user['id']
            }
            
            Measurement.create(data)

print('Sample data added successfully!')
