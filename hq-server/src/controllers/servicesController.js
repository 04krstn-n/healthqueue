/**
 * Services Controller — manage clinic services
 * Services are embedded in the Clinic document.
 * Used by: facility_admin (own clinic), super_admin (any)
 */
const Clinic = require('../models/Clinic');

// GET /api/services?clinicId=xxx — list services for a clinic
const getServices = async (req, res) => {
  try {
    const clinicId = req.query.clinicId || req.user.clinicId;
    if (!clinicId) return res.status(400).json({ message: 'clinicId is required.' });

    const clinic = await Clinic.findById(clinicId).select('name services');
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });
    return res.json({ clinicId: clinic._id, clinicName: clinic.name, services: clinic.services });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch services.' });
  }
};

// POST /api/services — add a service to a clinic
const addService = async (req, res) => {
  try {
    const { clinicId, name, description, durationMinutes, isAvailable } = req.body;
    const cId = clinicId || req.user.clinicId;
    if (!cId || !name) return res.status(400).json({ message: 'clinicId and name are required.' });

    const clinic = await Clinic.findById(cId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });

    const newService = { name: name.trim(), description: description || '', durationMinutes: durationMinutes || 30, isAvailable: isAvailable !== false };
    clinic.services.push(newService);
    await clinic.save();

    const added = clinic.services[clinic.services.length - 1];
    return res.status(201).json(added);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to add service.' });
  }
};

// PUT /api/services/:clinicId/:serviceId — update a service
const updateService = async (req, res) => {
  try {
    const { clinicId, serviceId } = req.params;
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });

    const svc = clinic.services.id(serviceId);
    if (!svc) return res.status(404).json({ message: 'Service not found.' });

    const allowed = ['name', 'description', 'durationMinutes', 'isAvailable'];
    allowed.forEach((f) => { if (req.body[f] !== undefined) svc[f] = req.body[f]; });
    await clinic.save();
    return res.json(svc);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update service.' });
  }
};

// DELETE /api/services/:clinicId/:serviceId — remove a service
const deleteService = async (req, res) => {
  try {
    const { clinicId, serviceId } = req.params;
    const clinic = await Clinic.findById(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found.' });

    clinic.services = clinic.services.filter((s) => s._id.toString() !== serviceId);
    await clinic.save();
    return res.json({ message: 'Service removed.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete service.' });
  }
};

module.exports = { getServices, addService, updateService, deleteService };
