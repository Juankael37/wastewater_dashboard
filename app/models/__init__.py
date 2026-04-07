"""
Database models for the Wastewater Monitoring System.
Simplified for Class C standards only.
"""

import sqlite3
from datetime import datetime
from typing import Dict, List, Optional, Any


def clear_all_data():
    """Clear all measurement data from database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM data")
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted_count


def clear_data_by_date_range(start_date: str, end_date: str):
    """Clear data within a specific date range."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM data WHERE date(timestamp) BETWEEN ? AND ?", (start_date, end_date))
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()
    return deleted_count


def get_data_count():
    """Get total count of measurements in database."""
    result = fetch_one("SELECT COUNT(*) as count FROM data")
    return result['count'] if result else 0


def get_db_connection():
    """Get a database connection with dict-style row factory."""
    conn = sqlite3.connect('data.db')
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database with required tables."""
    conn = get_db_connection()
    c = conn.cursor()

    # Create standards table (simplified for Class C only)
    c.execute("""
    CREATE TABLE IF NOT EXISTS standards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT UNIQUE,
        min_limit REAL,
        max_limit REAL
    )
    """)

    # Create data table with all parameters
    c.execute("""
    CREATE TABLE IF NOT EXISTS data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        ph REAL,
        cod REAL,
        bod REAL,
        tss REAL,
        ammonia REAL,
        nitrate REAL,
        phosphate REAL,
        temperature REAL,
        flow REAL,
        type TEXT DEFAULT 'effluent',
        plant_id INTEGER DEFAULT 1,
        operator_id INTEGER,
        notes TEXT
    )
    """)

    # Create alerts table
    c.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT,
        value REAL,
        status TEXT,
        state TEXT DEFAULT 'ACTIVE',
        timestamp TEXT,
        resolved_at TEXT
    )
    """)

    # Create users table
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )
    """)

    # Insert default standards if table is empty
    existing = c.execute("SELECT COUNT(*) as count FROM standards").fetchone()["count"]
    if existing == 0:
        # Class C standards only
        c.executemany("""
        INSERT INTO standards (parameter, min_limit, max_limit) VALUES (?, ?, ?)
        """, [
            ('ammonia', 0.0, 0.5),
            ('bod', 0.0, 50.0),
            ('cod', 0.0, 100.0),
            ('flow', 0.0, 5000.0),
            ('nitrate', 0.0, 14.0),
            ('ph', 6.0, 9.5),
            ('phosphate', 0.0, 1.0),
            ('temperature', 10.0, 40.0),
            ('tss', 0.0, 100.0)
        ])

    conn.commit()
    conn.close()


# Simple helper functions for database operations
def execute_query(query, params=()):
    """Execute a query and return results."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    
    if query.strip().upper().startswith('SELECT'):
        results = cursor.fetchall()
        conn.close()
        return results
    else:
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return last_id


def fetch_one(query, params=()):
    """Fetch a single row from database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(query, params)
    result = cursor.fetchone()
    conn.close()
    return dict(result) if result else None


# Parameter model
class Parameter:
    """Model for water quality parameters."""
    
    @staticmethod
    def get_all() -> List[Dict]:
        """Get all parameters with their standards."""
        rows = execute_query("SELECT * FROM standards ORDER BY parameter")
        return [dict(row) for row in rows]
    
    @staticmethod
    def get_by_name(parameter_name: str) -> Optional[Dict]:
        """Get a parameter by name."""
        return fetch_one("SELECT * FROM standards WHERE parameter = ?", (parameter_name,))
    
    @staticmethod
    def update(parameter_name: str, min_limit: float, max_limit: float) -> bool:
        """Update parameter standards."""
        try:
            execute_query(
                "UPDATE standards SET min_limit = ?, max_limit = ? WHERE parameter = ?",
                (min_limit, max_limit, parameter_name)
            )
            return True
        except Exception as e:
            print(f"Error updating standards: {e}")
            return False


# Measurement model
class Measurement:
    """Model for water quality measurements."""
    
    @staticmethod
    def create(**kwargs) -> int:
        """Create a new measurement."""
        query = """
        INSERT INTO data (
            timestamp, ph, cod, bod, tss, ammonia, nitrate, phosphate, 
            temperature, flow, type, plant_id, operator_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        # Helper function to safely convert and strip
        def safe_float(key):
            value = kwargs.get(key)
            if value is not None and str(value).strip():
                try:
                    return float(value)
                except ValueError:
                    return None
            return None
            
        def safe_int(key, default=1):
            value = kwargs.get(key)
            if value is not None and str(value).strip():
                try:
                    return int(value)
                except ValueError:
                    return default
            return default
        
        params = (
            kwargs.get('timestamp', datetime.now().isoformat()),
            safe_float('ph'),
            safe_float('cod'),
            safe_float('bod'),
            safe_float('tss'),
            safe_float('ammonia'),
            safe_float('nitrate'),
            safe_float('phosphate'),
            safe_float('temperature'),
            safe_float('flow'),
            kwargs.get('type', 'effluent'),
            safe_int('plant_id', 1),
            safe_int('operator_id'),
            kwargs.get('notes', '')
        )
        
        return execute_query(query, params)
    
    @staticmethod
    def get_all(limit: int = 1000) -> List[Dict]:
        """Get all measurements (limited)."""
        rows = execute_query(
            "SELECT * FROM data ORDER BY timestamp DESC LIMIT ?",
            (limit,)
        )
        return [dict(row) for row in rows]
    
    @staticmethod
    def get_recent(limit: int = 100) -> List[Dict]:
        """Get recent measurements."""
        rows = execute_query(
            "SELECT * FROM data ORDER BY timestamp DESC LIMIT ?",
            (limit,)
        )
        # Convert Row objects to dictionaries
        return [dict(row) for row in rows]
    
    @staticmethod
    def get_by_date_range(start_date: str, end_date: str) -> List[Dict]:
        """Get measurements within a date range."""
        rows = execute_query(
            "SELECT * FROM data WHERE date(timestamp) BETWEEN ? AND ? ORDER BY timestamp",
            (start_date, end_date)
        )
        return [dict(row) for row in rows]
    
    @staticmethod
    def get_for_chart() -> Dict[str, Any]:
        """Get chart data for dashboard visualization."""
        # Get last 7 days of data for charting
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get data for the last 7 days
        cursor.execute("""
            SELECT
                date(timestamp) as date,
                AVG(ph) as avg_ph,
                AVG(cod) as avg_cod,
                AVG(bod) as avg_bod,
                AVG(tss) as avg_tss,
                AVG(ammonia) as avg_ammonia,
                AVG(nitrate) as avg_nitrate,
                AVG(phosphate) as avg_phosphate,
                AVG(temperature) as avg_temperature,
                AVG(flow) as avg_flow
            FROM data
            WHERE date(timestamp) >= date('now', '-7 days')
            GROUP BY date(timestamp)
            ORDER BY date(timestamp)
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        # Format data for chart.js
        dates = []
        data = {
            'ph': [], 'cod': [], 'bod': [], 'tss': [],
            'ammonia': [], 'nitrate': [], 'phosphate': [],
            'temperature': [], 'flow': []
        }
        
        for row in rows:
            dates.append(row['date'])
            data['ph'].append(row['avg_ph'] if row['avg_ph'] is not None else 0)
            data['cod'].append(row['avg_cod'] if row['avg_cod'] is not None else 0)
            data['bod'].append(row['avg_bod'] if row['avg_bod'] is not None else 0)
            data['tss'].append(row['avg_tss'] if row['avg_tss'] is not None else 0)
            data['ammonia'].append(row['avg_ammonia'] if row['avg_ammonia'] is not None else 0)
            data['nitrate'].append(row['avg_nitrate'] if row['avg_nitrate'] is not None else 0)
            data['phosphate'].append(row['avg_phosphate'] if row['avg_phosphate'] is not None else 0)
            data['temperature'].append(row['avg_temperature'] if row['avg_temperature'] is not None else 0)
            data['flow'].append(row['avg_flow'] if row['avg_flow'] is not None else 0)
        
        return {
            'dates': dates,
            'data': data,
            'standards': {
                'ph': {'min': 6.0, 'max': 9.5},
                'cod': {'max': 100.0},
                'bod': {'max': 50.0},
                'tss': {'max': 100.0},
                'ammonia': {'max': 0.5},
                'nitrate': {'max': 14.0},
                'phosphate': {'max': 1.0},
                'temperature': {'min': 10.0, 'max': 40.0},
                'flow': {'max': 5000.0}
            }
        }


# Alert model
class Alert:
    """Model for alerts."""
    
    @staticmethod
    def create(parameter: str, value: float, status: str) -> int:
        """Create a new alert."""
        return execute_query(
            """INSERT INTO alerts (parameter, value, status, state, timestamp) 
               VALUES (?, ?, ?, 'ACTIVE', ?)""",
            (parameter, value, status, datetime.now().isoformat())
        )
    
    @staticmethod
    def get_active() -> List[Dict]:
        """Get all active alerts."""
        rows = execute_query(
            "SELECT * FROM alerts WHERE state = 'ACTIVE' ORDER BY timestamp DESC"
        )
        return [dict(row) for row in rows]
    
    @staticmethod
    def resolve(alert_id: int) -> bool:
        """Resolve an alert by ID."""
        resolved_at = datetime.now().isoformat()
        try:
            execute_query(
                "UPDATE alerts SET state = 'RESOLVED', resolved_at = ? WHERE id = ?",
                (resolved_at, alert_id)
            )
            return True
        except Exception:
            return False


# Report model
class Report:
    """Model for generating reports."""
    
    @staticmethod
    def get_summary(start_date: str, end_date: str) -> Dict[str, Any]:
        """Get summary statistics for a date range."""
        # Get measurements in date range
        rows = execute_query(
            """SELECT * FROM data
               WHERE date(timestamp) BETWEEN ? AND ?
               ORDER BY timestamp""",
            (start_date, end_date)
        )
        
        if not rows:
            return {
                "count": 0,
                "parameters": {},
                "compliance_rate": 0,
                "alerts": 0
            }
        
        # Convert rows to dicts (sqlite3.Row doesn't have .get())
        rows = [dict(row) for row in rows]
        
        # Get standards for compliance checking
        standards = {row['parameter']: row for row in Parameter.get_all()}
        
        # Calculate statistics
        total_measurements = len(rows)
        compliant_count = 0
        parameter_stats = {}
        
        for row in rows:
            row_compliant = True
            
            for param in ['ph', 'cod', 'bod', 'tss', 'ammonia', 'nitrate', 'phosphate', 'temperature', 'flow']:
                value = row.get(param)
                if value is not None:
                    standard = standards.get(param)
                    if standard:
                        min_limit = standard['min_limit']
                        max_limit = standard['max_limit']
                        
                        if min_limit <= value <= max_limit:
                            # Count as compliant for this parameter
                            if param not in parameter_stats:
                                parameter_stats[param] = {'compliant': 0, 'total': 0}
                            parameter_stats[param]['compliant'] += 1
                        else:
                            row_compliant = False
                        
                        if param not in parameter_stats:
                            parameter_stats[param] = {'compliant': 0, 'total': 0}
                        parameter_stats[param]['total'] += 1
            
            if row_compliant:
                compliant_count += 1
        
        # Calculate compliance rates
        compliance_rate = (compliant_count / total_measurements * 100) if total_measurements > 0 else 0
        
        # Get active alerts count
        active_alerts = len(Alert.get_active())
        
        return {
            "count": total_measurements,
            "parameters": parameter_stats,
            "compliance_rate": round(compliance_rate, 2),
            "alerts": active_alerts
        }


# User model
class User:
    """Model for user authentication."""
    
    @staticmethod
    def get_by_username(username: str) -> Optional[Dict]:
        """Get user by username."""
        return fetch_one("SELECT * FROM users WHERE username = ?", (username,))
    
    @staticmethod
    def create(username: str, password: str) -> int:
        """Create a new user with hashed password."""
        from werkzeug.security import generate_password_hash
        hashed_password = generate_password_hash(password)
        return execute_query(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            (username, hashed_password)
        )
    
    @staticmethod
    def verify_password(username: str, password: str) -> bool:
        """Verify user password."""
        from werkzeug.security import check_password_hash
        user = User.get_by_username(username)
        if user:
            return check_password_hash(user['password'], password)
        return False


def create_admin():
    """Create default admin user if not exists."""
    from werkzeug.security import generate_password_hash
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute(
            "INSERT INTO users (username, password) VALUES (?, ?)",
            ("admin", generate_password_hash("admin123"))
        )
    except sqlite3.IntegrityError:
        pass  # Admin user already exists
    
    conn.commit()
    conn.close()


# Initialize database when module is imported
init_db()