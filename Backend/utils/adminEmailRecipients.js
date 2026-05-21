const Admin = require('../models/admin.model');

const getAdminEmailRecipients = async () => {
  const admins = await Admin.find({
    email: { $exists: true, $ne: '' },
  })
    .select('email')
    .lean();

  return [...new Set(admins.map((admin) => admin.email).filter(Boolean))];
};

module.exports = { getAdminEmailRecipients };
