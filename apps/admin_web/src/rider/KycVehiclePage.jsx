import React from 'react';
import './KycVehiclePage.css';
import { useRider } from './shared/RiderContext';
import { RPButton, RPField } from './shared/RiderUI';
import { ShieldCheck, ShieldAlert, Bike, Zap } from 'lucide-react';

export function KycVehiclePage() {
  const {
    kycStatus,
    vehicleType,
    setVehicleType,
    vehicleModel,
    setVehicleModel,
    vehicleNumber,
    setVehicleNumber,
    licenseNumber,
    setLicenseNumber,
    upiId,
    setUpiId,
    savingKyc,
    handleSaveKyc
  } = useRider();

  return (
    <div className="rp-content rp-content--narrow">
      <div className="rp-surface rp-fade-up">
        {/* Header with status badge */}
        <div className="rp-kyc-head">
          <div>
            <h2 className="rp-heading">Vehicle &amp; KYC Documents</h2>
            <p className="rp-subheading">
              Keep your campus vehicle credentials and payout details updated.
            </p>
          </div>
          <span className={`rp-status-chip rp-status-chip--lg ${kycStatus === 'APPROVED' ? 'rp-status-chip--emerald' : kycStatus === 'PENDING' ? 'rp-status-chip--amber' : 'rp-status-chip--rose'}`}>
            {kycStatus === 'APPROVED' ? 'APPROVED BY ADMIN' : kycStatus === 'PENDING' ? 'PENDING ADMIN REVIEW' : 'REJECTED'}
          </span>
        </div>

        {/* Verification Status Card */}
        {kycStatus !== 'APPROVED' ? (
          <div className={`rp-kyc-warning rp-fade-up ${kycStatus === 'PENDING' ? 'is-pending' : 'is-rejected'}`}>
            <ShieldAlert size={24} />
            <div>
              <div className="rp-kyc-warning-title">
                {kycStatus === 'PENDING' ? 'Document Verification in Progress:' : 'Verification Rejected:'}
              </div>
              <div className="rp-kyc-warning-sub">
                {kycStatus === 'PENDING'
                  ? 'Your Campus ID Card, Driving Licence, and Vehicle RC have been submitted and are currently waiting for approval from the Campus Administrator. You will be able to go online and accept rides once approved.'
                  : 'Your documents were rejected. Please review or update your credentials below.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="rp-kyc-approved rp-fade-up">
            <ShieldCheck size={22} color="#059669" />
            <div>
              <strong>Verified Driver Account:</strong> All your documents have been verified and approved by Campus Admin. You can go online anytime to accept student rides.
            </div>
          </div>
        )}

        {/* Details Form */}
        <form onSubmit={handleSaveKyc} className="rp-form">
          <RPField label="Vehicle Type">
            <div className="rp-seg-2">
              <button
                type="button"
                onClick={() => setVehicleType('BIKE')}
                className={`rp-seg-btn ${vehicleType === 'BIKE' ? 'is-active' : ''}`}
              >
                <Bike size={18} /> Bike (Motorcycle)
              </button>
              <button
                type="button"
                onClick={() => setVehicleType('SCOOTER')}
                className={`rp-seg-btn ${vehicleType === 'SCOOTER' ? 'is-active' : ''}`}
              >
                <Zap size={18} /> Scooter / Scooty
              </button>
            </div>
          </RPField>

          <RPField label="Vehicle Model">
            <input
              type="text"
              className="rp-input"
              placeholder="e.g. Hero Splendor Plus / Honda Activa 6G"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              required
            />
          </RPField>

          <RPField label="Vehicle Registration Number">
            <input
              type="text"
              className="rp-input"
              placeholder="e.g. PY-01-AB-1234"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              required
            />
          </RPField>

          <RPField label="Driving License Number">
            <input
              type="text"
              className="rp-input"
              placeholder="e.g. DL-0120110012345"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              required
            />
          </RPField>

          <RPField
            label="Driver UPI ID (For Direct Cancellation Compensation & Online Payments)"
            hint="If a passenger cancels after you reach their pickup spot, their ₹15 cancellation fee will be directed to this UPI ID."
          >
            <input
              type="text"
              className="rp-input"
              placeholder="e.g. 9876543210@paytm / driver@okaxis"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
          </RPField>

          <RPButton
            type="submit"
            variant="primary"
            size="lg"
            block
            loading={savingKyc}
            disabled={savingKyc}
          >
            {savingKyc ? 'Updating Documents...' : 'Save & Submit KYC Details'}
          </RPButton>
        </form>
      </div>
    </div>
  );
}
export default KycVehiclePage;
