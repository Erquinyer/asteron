const db = require('../config/db');

exports.getCotizaciones = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM cotizaciones ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las cotizaciones' });
    }
};

exports.getRemisiones = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM remisiones ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener las remisiones' });
    }
};