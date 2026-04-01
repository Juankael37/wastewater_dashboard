"""
Database models for the Wastewater Monitoring System.
This module provides data models and database operations.
"""

import sqlite3
from datetime import datetime
from typing import Dict, List, Optional, Any


def get_db_connection():
    """Get a database connection with dict-style row factory."""
    conn = sqlite3.connect('data.db')
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database with required tables."""
    conn = get_db_connection()
    c = conn.cursor()

    # Create standards table
    c.execute("""
    CREATE TABLE IF NOT EXISTS standards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        parameter TEXT UNIQUE,
        class_a_min REAL,
        class_a_max REAL,
        class_b_min REAL,
        class_b_max REAL,
        class_c_min REAL,
        class_c_max REAL
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

    # Insert default standards if table is empty
    existing = c.execute("SELECT COUNT(*) as count FROM standards").fetchone()["count"]
    if existing == 0:
        c.executemany("""
        INSERT INTO standards (
            parameter,
            class_a_min, class_a_max,
            class_b_min, class_b_max,
            class_c_min, class_c_max
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [
            ('ph', 6.0, 9.0, 6.0, 9.0, 6.0, 9.5),
            ('cod', 0, 60, 0, 60, 0, 100),
            ('bod', 0, 20, 0, 30, 0, 50),
            ('tss', 0, 70, 0, 85, 0, 100),
            ('ammonia', 0, 0.3, 0, 0.5, 0, 0.5),
            ('nitrate', 0, 10, 0, 12, 0, 14),
            ('phosphate', 0, 0.5, 0, 0.8, 0, 1.0),
            ('temperature', 20, 30, 15, 35, 10, 40),
            ('flow', 0, 1000, 0, 2000, 0, 5000)
        ])

    conn.commit()
    conn.close()


class BaseModel:
    """Base model class with common database operations."""
    
    @staticmethod
    def execute_query(query: str, params: tuple = (), fetch_one: bool = False):
        """Execute a SQL query and return results."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        
        if fetch_one:
            result = cursor.fetchone()
        else:
            result = cursor.fetchall()
        
        conn.commit()
        conn.close()
        
        if result and fetch_one:
            return dict(result)
        elif result:
            return [dict(row) for row in result]
        return None


class Parameter(BaseModel):
    """Model for water quality parameters."""
    
    @staticmethod
    def get_all() -> List[Dict]:
        """Get all parameters from the database."""
        return BaseModel.execute_query("SELECT * FROM standards ORDER BY parameter")
    
    @staticmethod
    def get_by_name(parameter_name: str) -> Optional[Dict]:
        """Get a parameter by its name."""
        result = BaseModel.execute_query(
            "SELECT * FROM standards WHERE parameter = ?",
            (parameter_name,),
            fetch_one=True
        )
        return result
    
    @staticmethod
    def update(parameter_name: str, class_c_min: float, class_c_max: float) -> bool:
        """Update parameter standards."""
        try:
            BaseModel.execute_query(
                """UPDATE standards 
                   SET class_c_min = ?, class_c_max = ? 
                   WHERE parameter = ?""",
                (class_c_min, class_c_max, parameter_name)
            )
            return True
        except Exception:
            return False


class Measurement(BaseModel):
    """Model for wastewater measurements."""
    
    @staticmethod
    def create(
        timestamp: str,
        ph: float = None,
        cod: float = None,
        bod: float = None,
        tss: float = None,
        ammonia: float = None,
        nitrate: float = None,
        phosphate: float = None,
        temperature: float = None,
        flow: float = None,
        measurement_type: str = 'effluent',
        plant_id: int = 1,
        operator_id: int = None,
        notes: str = None
    ) -> int:
        """Create a new measurement record with all parameters."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO data (
                timestamp, ph, cod, bod, tss, ammonia, nitrate, phosphate,
                temperature, flow, type, plant_id, operator_id, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                timestamp, ph, cod, bod, tss, ammonia, nitrate, phosphate,
                temperature, flow, measurement_type, plant_id, operator_id, notes
            )
        )
        measurement_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return measurement_id
    
    @staticmethod
    def get_all(limit: int = 100) -> List[Dict]:
        """Get all measurements with optional limit."""
        return BaseModel.execute_query(
            "SELECT * FROM data ORDER BY timestamp DESC LIMIT ?",
            (limit,)
        )
    
    @staticmethod
    def get_recent(days: int = 7) -> List[Dict]:
        """Get recent measurements for the last N days."""
        # SQLite doesn't support parameters inside date() function
        # So we need to use string formatting for the days parameter
        return BaseModel.execute_query(
            f"""SELECT * FROM data
               WHERE date(timestamp) >= date('now', '-{days} days')
               ORDER BY timestamp DESC"""
        )
    
    @staticmethod
    def get_for_chart() -> Dict[str, List]:
        """Get data formatted for charts."""
        rows = BaseModel.execute_query(
            "SELECT timestamp, ph, cod, bod, tss, ammonia, nitrate, phosphate, temperature, flow FROM data ORDER BY timestamp ASC"
        )
        
        if not rows:
            return {
                "labels": [],
                "ph": [], "cod": [], "bod": [], "tss": [],
                "ammonia": [], "nitrate": [], "phosphate": [],
                "temperature": [], "flow": []
            }
        
        return {
            "labels": [r["timestamp"] for r in rows],
            "ph": [r["ph"] for r in rows],
            "cod": [r["cod"] for r in rows],
            "bod": [r["bod"] for r in rows],
            "tss": [r["tss"] for r in rows],
            "ammonia": [r["ammonia"] for r in rows],
            "nitrate": [r["nitrate"] for r in rows],
            "phosphate": [r["phosphate"] for r in rows],
            "temperature": [r["temperature"] for r in rows],
            "flow": [r["flow"] for r in rows],
        }


class Alert(BaseModel):
    """Model for system alerts."""
    
    @staticmethod
    def create(parameter: str, value: float, status: str, state: str = "ACTIVE") -> int:
        """Create a new alert."""
        timestamp = datetime.now().isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO alerts (parameter, value, status, state, timestamp) 
               VALUES (?, ?, ?, ?, ?)""",
            (parameter, value, status, state, timestamp)
        )
        alert_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return alert_id
    
    @staticmethod
    def get_active() -> List[Dict]:
        """Get all active alerts."""
        return BaseModel.execute_query(
            "SELECT * FROM alerts WHERE state = 'ACTIVE' ORDER BY timestamp DESC"
        )
    
    @staticmethod
    def resolve(alert_id: int) -> bool:
        """Resolve an alert by ID."""
        resolved_at = datetime.now().isoformat()
        try:
            BaseModel.execute_query(
                "UPDATE alerts SET state = 'RESOLVED', resolved_at = ? WHERE id = ?",
                (resolved_at, alert_id)
            )
            return True
        except Exception:
            return False


class Report(BaseModel):
    """Model for generating reports."""
    
    @staticmethod
    def get_summary(start_date: str, end_date: str) -> Dict[str, Any]:
        """Get summary statistics for a date range."""
        # Get measurements in date range
        rows = BaseModel.execute_query(
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
        
        # Calculate statistics for all parameters
        all_params = ["ph", "cod", "bod", "tss", "ammonia", "nitrate", "phosphate", "temperature", "flow"]
        stats = {}
        
        for param in all_params:
            values = [r[param] for r in rows if r[param] is not None]
            if values:
                stats[param] = {
                    "count": len(values),
                    "avg": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values)
                }
            else:
                stats[param] = {"count": 0, "avg": 0, "min": 0, "max": 0}
        
        # Get standards for compliance calculation
        standards = Parameter.get_all()
        compliance_count = 0
        total_checks = 0
        
        for row in rows:
            for param in all_params:
                if row[param] is not None:
                    total_checks += 1
                    # Check against Class C standards
                    standard = next((s for s in standards if s["parameter"] == param), None)
                    if standard:
                        if standard["class_c_min"] <= row[param] <= standard["class_c_max"]:
                            compliance_count += 1
        
        compliance_rate = (compliance_count / total_checks * 100) if total_checks > 0 else 0
        
        return {
            "count": len(rows),
            "parameters": stats,
            "compliance_rate": round(compliance_rate, 2),
            "alerts": len(Alert.get_active())
        }