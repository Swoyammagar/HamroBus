const Sos = require('../../models/sos.model');

/**
 * GET /api/admin/sos
 * Query params: status, busId, driverId, limit, skip
 */
const listSos = async (req, res) => {
  try {
    const { status, busId, driverId, limit = 50, skip = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (busId) filter.busId = busId;
    if (driverId) filter.driverId = driverId;

    const total = await Sos.countDocuments(filter);
    const rows = await Sos.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    return res.status(200).json({ success: true, data: rows, pagination: { total, limit: parseInt(limit), skip: parseInt(skip) } });
  } catch (error) {
    console.error('Error listing SOS:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch SOS list' });
  }
};

const getSosById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, message: 'SOS id required' });

    const doc = await Sos.findById(id).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'SOS not found' });

    return res.status(200).json({ success: true, data: doc });
  } catch (error) {
    console.error('Error fetching SOS by id:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch SOS' });
  }
};

module.exports = { listSos, getSosById };
