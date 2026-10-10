import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema({
    eligibilityVerified: { type: Boolean, default: false },
    identityVerified: { type: Boolean, default: false },
    nominationVerified: { type: Boolean, default: false },
    supportDataVerified: { type: Boolean, default: false },
    depositVerified: { type: Boolean, default: false },
    declarationsVerified: { type: Boolean, default: false }
}, { _id: false });

const candidateSchema = new mongoose.Schema({
    // --- 1. Personal Identity & Qualifications ---
    candidateId: { type: String, required: true, unique: true },
    fullName: {
        type: String,
        required: [true, "Full name as per legal documents is required"],
        trim: true
    },
    address: { type: String, required: true },
    occupation: { type: String, required: true },
    dateOfBirth: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                const ageLimit = 30;
                const today = new Date();
                const age = today.getFullYear() - value.getFullYear();
                return age >= ageLimit;
            },
            message: "Candidate must be at least 30 years of age."
        }
    },
    isSriLankanCitizen: { type: Boolean, required: true, default: false },
    isDualCitizen: { type: Boolean, required: true, default: false },

    // --- 2. Candidacy & Support Data ---
    candidacyType: {
        type: String,
        enum: ['Party', 'Independent'],
        required: true
    },
    partyAffiliation: {
        partyName: String,
        secretarySignatureUrl: String,
    },
    legislativeHistory: {
        isExMP: { type: Boolean, default: false },
        certificateUrl: String
    },
    supportData: {
        proposer: {
            name: String,
            voterRegistrationNumber: String
        },
        seconder: {
            name: String,
            voterRegistrationNumber: String
        }
    },

    // --- 3. Financial Data & Security Deposits ---
    securityDeposit: {
        amount: { type: Number, required: true },
        receiptNumber: { type: String, required: true },
        paymentDate: { type: Date, default: Date.now }
    },

    // --- 4. Legal Declarations ---
    declarations: {
        hasBeenElectedTwice: { type: Boolean, default: false },
        isOfSoundMind: { type: Boolean, default: true },
        hasCriminalConviction: { type: Boolean, default: false },
        hasSignedConsent: { type: Boolean, default: false }
    },

    // --- 5. Symbol & Identification for Ballot ---
    ballotDetails: {
        ballotName: { type: String, required: true },
        symbolName: { type: String, required: true },
        symbolImageUrl: { type: String }
    },

    // --- 6. Election Officer Verification ---
    verification: {
        checks: {
            type: verificationSchema,
            default: () => ({})
        },
        officerEmail: { type: String, default: null },
        verifiedAt: { type: Date, default: null },
        notes: { type: String, default: "" }
    },

    status: {
        type: String,
        enum: ['Pending', 'Under Verification', 'Accepted', 'Rejected'],
        default: 'Pending'
    }
}, { timestamps: true });

const Candidate = mongoose.model('Candidate', candidateSchema);
export default Candidate;
