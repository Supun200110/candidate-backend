import Candidate from '../models/candidate.js';

const getNextCandidateId = async () => {
    const lastCandidate = await Candidate.findOne().sort({ createdAt: -1 });

    if (!lastCandidate?.candidateId) {
        return "CAN0001";
    }

    const lastNumber = parseInt(String(lastCandidate.candidateId).replace("CAN", ""), 10);
    if (Number.isNaN(lastNumber)) {
        return "CAN0001";
    }

    return "CAN" + String(lastNumber + 1).padStart(4, "0");
};

export async function saveCandidate(req, res) {
    if (req.user.email !== "supunnishantha45@gmail.com") {
        return res.status(403).json({
            message: "Unauthorized: Only the official admin can save candidates."
        });
    }

    try {
        const body = req.body;
        const nextId = await getNextCandidateId();

        const newCandidate = new Candidate({
            candidateId: nextId,
            fullName: body.fullName,
            address: body.address,
            occupation: body.occupation,
            dateOfBirth: body.dateOfBirth,
            isSriLankanCitizen: body.isSriLankanCitizen ?? false,
            isDualCitizen: body.isDualCitizen ?? false,
            candidacyType: body.candidacyType,

            partyAffiliation: {
                partyName: body.partyAffiliation?.partyName,
                secretarySignatureUrl: body.partyAffiliation?.secretarySignatureUrl
            },
            legislativeHistory: {
                isExMP: body.legislativeHistory?.isExMP ?? false,
                certificateUrl: body.legislativeHistory?.certificateUrl
            },
            supportData: {
                proposer: {
                    name: body.supportData?.proposer?.name,
                    voterRegistrationNumber: body.supportData?.proposer?.voterRegistrationNumber
                },
                seconder: {
                    name: body.supportData?.seconder?.name,
                    voterRegistrationNumber: body.supportData?.seconder?.voterRegistrationNumber
                }
            },
            securityDeposit: {
                amount: body.securityDeposit?.amount,
                receiptNumber: body.securityDeposit?.receiptNumber,
                paymentDate: body.securityDeposit?.paymentDate || new Date()
            },
            declarations: {
                hasBeenElectedTwice: body.declarations?.hasBeenElectedTwice ?? false,
                isOfSoundMind: body.declarations?.isOfSoundMind ?? true,
                hasCriminalConviction: body.declarations?.hasCriminalConviction ?? false,
                hasSignedConsent: body.declarations?.hasSignedConsent ?? false
            },
            ballotDetails: {
                ballotName: body.ballotDetails?.ballotName,
                symbolName: body.ballotDetails?.symbolName,
                symbolImageUrl: body.ballotDetails?.symbolImageUrl
            },
            status: "Pending"
        });

        await newCandidate.save();

        res.status(201).json({
            message: "Candidate saved successfully by Admin",
            id: nextId
        });
    } catch (err) {
        res.status(500).json({
            message: "Error saving candidate: " + err.message
        });
    }
}

// Election officer: view all candidate applications
export async function getCandidates(req, res) {
    try {
        const candidates = await Candidate.find()
            .sort({ createdAt: -1 })
            .select("-__v");

        res.json(candidates);
    } catch (err) {
        res.status(500).json({
            message: "Error loading candidates: " + err.message
        });
    }
}

// Election officer: view one candidate
export async function getCandidateById(req, res) {
    try {
        const candidate = await Candidate.findOne({ candidateId: req.params.id })
            .select("-__v");

        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found." });
        }

        res.json(candidate);
    } catch (err) {
        res.status(500).json({
            message: "Error loading candidate: " + err.message
        });
    }
}

// Election officer: accept/reject a candidate after verification
export async function verifyCandidate(req, res) {
    try {
        const { status, checks, notes } = req.body;

        if (!["Accepted", "Rejected", "Under Verification"].includes(status)) {
            return res.status(400).json({
                message: "Invalid verification status."
            });
        }

        const candidate = await Candidate.findOne({ candidateId: req.params.id });

        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found." });
        }

        const verificationChecks = {
            eligibilityVerified: Boolean(checks?.eligibilityVerified),
            identityVerified: Boolean(checks?.identityVerified),
            nominationVerified: Boolean(checks?.nominationVerified),
            supportDataVerified: Boolean(checks?.supportDataVerified),
            depositVerified: Boolean(checks?.depositVerified),
            declarationsVerified: Boolean(checks?.declarationsVerified)
        };

        // A candidate can only be accepted after all verification items are checked.
        if (status === "Accepted") {
            const allVerified = Object.values(verificationChecks).every(Boolean);

            if (!allVerified) {
                return res.status(400).json({
                    message: "All verification checks must be completed before accepting the candidate."
                });
            }

            if (!candidate.declarations?.hasSignedConsent) {
                return res.status(400).json({
                    message: "Candidate consent must be verified before acceptance."
                });
            }
        }

        if (status === "Rejected" && !String(notes || "").trim()) {
            return res.status(400).json({
                message: "Please provide a reason for rejection."
            });
        }

        candidate.status = status;
        candidate.verification = {
            checks: verificationChecks,
            officerEmail: req.user.email,
            verifiedAt: new Date(),
            notes: String(notes || "").trim()
        };

        await candidate.save();

        res.json({
            message: `Candidate ${status.toLowerCase()} successfully.`,
            candidate
        });
    } catch (err) {
        res.status(500).json({
            message: "Error verifying candidate: " + err.message
        });
    }
}
