import Candidate from '../models/candidate.js';
import { uploadToSupabase } from '../config/supabase.js';

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

const parseField = (field) => {
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch {
            return field;
        }
    }
    return field || {};
};

/**
 * Dedicated controller for uploading candidate image and party symbol to Supabase
 * Optionally updates an existing candidate if candidateId is provided.
 */
export async function uploadCandidateImagesHandler(req, res) {
    try {
        const candidateImageFile = req.files?.candidateImage?.[0] || req.files?.candidatePhoto?.[0];
        const partySymbolFile = req.files?.partySymbol?.[0] || req.files?.symbolImage?.[0];

        if (!candidateImageFile && !partySymbolFile) {
            return res.status(400).json({
                message: "No files uploaded. Please upload at least one image in 'candidateImage' or 'partySymbol'."
            });
        }

        const uploadedUrls = {};

        if (candidateImageFile) {
            const { url } = await uploadToSupabase(candidateImageFile, 'candidates');
            uploadedUrls.candidateImageUrl = url;
        }

        if (partySymbolFile) {
            const { url } = await uploadToSupabase(partySymbolFile, 'party-symbols');
            uploadedUrls.partySymbolUrl = url;
            uploadedUrls.symbolImageUrl = url;
        }

        // Optional: If candidateId is provided, update MongoDB directly
        const candidateId = req.body?.candidateId || req.query?.candidateId || req.params?.id;
        let updatedCandidate = null;

        if (candidateId) {
            const updateData = {};
            if (uploadedUrls.candidateImageUrl) {
                updateData.candidateImageUrl = uploadedUrls.candidateImageUrl;
            }
            if (uploadedUrls.partySymbolUrl) {
                updateData['ballotDetails.symbolImageUrl'] = uploadedUrls.partySymbolUrl;
                updateData['partyAffiliation.partySymbolUrl'] = uploadedUrls.partySymbolUrl;
            }

            updatedCandidate = await Candidate.findOneAndUpdate(
                { candidateId },
                { $set: updateData },
                { new: true }
            );
        }

        return res.status(200).json({
            message: "Images uploaded successfully to Supabase",
            data: uploadedUrls,
            candidate: updatedCandidate || undefined
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error uploading images: " + err.message
        });
    }
}

/**
 * Update candidate images by candidateId in MongoDB
 */
export async function updateCandidateImages(req, res) {
    try {
        const { id } = req.params;
        const candidateImageFile = req.files?.candidateImage?.[0] || req.files?.candidatePhoto?.[0];
        const partySymbolFile = req.files?.partySymbol?.[0] || req.files?.symbolImage?.[0];

        if (!candidateImageFile && !partySymbolFile) {
            return res.status(400).json({
                message: "Please attach 'candidateImage' or 'partySymbol' to update."
            });
        }

        const candidate = await Candidate.findOne({ candidateId: id });
        if (!candidate) {
            return res.status(404).json({ message: "Candidate not found." });
        }

        if (candidateImageFile) {
            const { url } = await uploadToSupabase(candidateImageFile, 'candidates');
            candidate.candidateImageUrl = url;
        }

        if (partySymbolFile) {
            const { url } = await uploadToSupabase(partySymbolFile, 'party-symbols');
            if (!candidate.ballotDetails) candidate.ballotDetails = {};
            candidate.ballotDetails.symbolImageUrl = url;
            if (candidate.partyAffiliation) {
                candidate.partyAffiliation.partySymbolUrl = url;
            }
        }

        await candidate.save();

        return res.status(200).json({
            message: "Candidate images updated successfully",
            candidate
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error updating candidate images: " + err.message
        });
    }
}

/**
 * Save candidate with support for both JSON body and multipart/form-data image uploads
 */
export async function saveCandidate(req, res) {
    if (req.user.email !== "supunnishantha45@gmail.com") {
        return res.status(403).json({
            message: "Unauthorized: Only the official admin can save candidates."
        });
    }

    try {
        const body = req.body;
        const partyAffiliation = parseField(body.partyAffiliation);
        const legislativeHistory = parseField(body.legislativeHistory);
        const supportData = parseField(body.supportData);
        const securityDeposit = parseField(body.securityDeposit);
        const declarations = parseField(body.declarations);
        const ballotDetails = parseField(body.ballotDetails);

        let candidateImageUrl = body.candidateImageUrl || "";
        let symbolImageUrl = ballotDetails?.symbolImageUrl || body.symbolImageUrl || body.partySymbolUrl || "";

        // Check if files were uploaded directly with the form
        const candidateImageFile = req.files?.candidateImage?.[0] || req.files?.candidatePhoto?.[0];
        const partySymbolFile = req.files?.partySymbol?.[0] || req.files?.symbolImage?.[0];

        if (candidateImageFile) {
            const uploadRes = await uploadToSupabase(candidateImageFile, 'candidates');
            candidateImageUrl = uploadRes.url;
        }

        if (partySymbolFile) {
            const uploadRes = await uploadToSupabase(partySymbolFile, 'party-symbols');
            symbolImageUrl = uploadRes.url;
        }

        const nextId = await getNextCandidateId();

        const newCandidate = new Candidate({
            candidateId: nextId,
            fullName: body.fullName,
            address: body.address,
            occupation: body.occupation,
            dateOfBirth: body.dateOfBirth,
            isSriLankanCitizen: body.isSriLankanCitizen === true || body.isSriLankanCitizen === 'true',
            isDualCitizen: body.isDualCitizen === true || body.isDualCitizen === 'true',
            candidateImageUrl: candidateImageUrl,
            candidacyType: body.candidacyType,

            partyAffiliation: {
                partyName: partyAffiliation?.partyName,
                partySymbolUrl: symbolImageUrl,
                secretarySignatureUrl: partyAffiliation?.secretarySignatureUrl
            },
            legislativeHistory: {
                isExMP: legislativeHistory?.isExMP === true || legislativeHistory?.isExMP === 'true',
                certificateUrl: legislativeHistory?.certificateUrl
            },
            supportData: {
                proposer: {
                    name: supportData?.proposer?.name,
                    voterRegistrationNumber: supportData?.proposer?.voterRegistrationNumber
                },
                seconder: {
                    name: supportData?.seconder?.name,
                    voterRegistrationNumber: supportData?.seconder?.voterRegistrationNumber
                }
            },
            securityDeposit: {
                amount: Number(securityDeposit?.amount) || 0,
                receiptNumber: securityDeposit?.receiptNumber,
                paymentDate: securityDeposit?.paymentDate || new Date()
            },
            declarations: {
                hasBeenElectedTwice: declarations?.hasBeenElectedTwice === true || declarations?.hasBeenElectedTwice === 'true',
                isOfSoundMind: declarations?.isOfSoundMind === undefined ? true : (declarations?.isOfSoundMind === true || declarations?.isOfSoundMind === 'true'),
                hasCriminalConviction: declarations?.hasCriminalConviction === true || declarations?.hasCriminalConviction === 'true',
                hasSignedConsent: declarations?.hasSignedConsent === true || declarations?.hasSignedConsent === 'true'
            },
            ballotDetails: {
                ballotName: ballotDetails?.ballotName,
                symbolName: ballotDetails?.symbolName,
                symbolImageUrl: symbolImageUrl
            },
            status: "Pending"
        });

        await newCandidate.save();

        res.status(201).json({
            message: "Candidate saved successfully by Admin",
            id: nextId,
            candidate: newCandidate
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
