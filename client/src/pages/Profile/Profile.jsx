import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
    updateProfile,
    changePassword,
    deleteProfilePic,
    getProfileByEmail
} from '../../api/user';
import defaultAvatar from '../../assets/images/pic3.webp';
import PasswordStrengthBar from 'react-password-strength-bar';
import CommonModal from '../../components/common/CommonModal';
import { useProfile } from "../../context/ProfileContext";
import { useEffect } from 'react';
import { getUser } from '../../utils/auth';

const Profile = () => {
    const [tab, setTab] = useState('profile');
    const [profile, setProfile] = useProfile(); // Shared context
    const [saving, setSaving] = useState(false);
    const [changing, setChanging] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [showDeletePicModal, setShowDeletePicModal] = useState(false);
    const [form, setForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (profile) return; // Prevent unnecessary refetch

        const fetchProfile = async () => {
            try {
                const { email } = getUser();
                const data = await getProfileByEmail(email);
                setProfile(data);
            } catch (err) {
                toast.error("Failed to load profile");
            }
        };

        fetchProfile();
    }, []);

    const formatMobile = (num) => {
        const cleaned = num.replace(/\D/g, '').slice(0, 10);
        return cleaned.length > 5 ? `${cleaned.slice(0, 5)} ${cleaned.slice(5)}` : cleaned;
    };

    const handleProfileChange = (e) => {
        let { name, value, type } = e.target;

        if (name === 'phone') value = formatMobile(value);
        if (type === 'number') value = Number(value);
        else value = value.trimStart();

        setProfile(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);

            const updatedData = {
                name: profile.name,
                email: profile.email,
                phone: profile.phone,
                dob: profile.dob,
                role: profile.role,
            };

            if (selectedFile) {
                updatedData.profilePic = selectedFile;
            }

            // Update profile on server
            await updateProfile(profile._id, updatedData);

            // Fetch updated profile to reflect server response
            const { email } = getUser();
            const updatedProfile = await getProfileByEmail(email);

            // ✅ Update global context
            setProfile(updatedProfile);

            toast.success("Profile updated successfully.");
            setSelectedFile(null);
        } catch (err) {
            toast.error(err?.message || "Profile update failed.");
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
            return toast.error("All fields are required.");
        }

        if (form.newPassword !== form.confirmPassword) {
            return toast.error("Passwords do not match.");
        }

        try {
            setChanging(true);
            await changePassword({
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            toast.success("Password updated successfully.");
            setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to update password.");
        } finally {
            setChanging(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const previewURL = URL.createObjectURL(file);
            setProfile(prev => ({ ...prev, profilePic: previewURL }));
        }
    };

    if (!profile) return <div className="text-black p-4">Loading profile...</div>;

    return (
        <div className="profile-wrapper py-5 px-4">
            <div className="card profile-card shadow p-4">
                <div className="d-flex justify-content-center mb-4">
                    <ul className="nav nav-tabs">
                        <li className="nav-item">
                            <button className={`nav-link ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
                                Edit Profile
                            </button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${tab === 'password' ? 'active' : ''}`} onClick={() => setTab('password')}>
                                Change Password
                            </button>
                        </li>
                    </ul>
                </div>

                {tab === 'profile' && (
                    <div className="row">
                        <div className="col-md-4 text-center">
                            <img
                                src={
                                    selectedFile
                                        ? URL.createObjectURL(selectedFile)
                                        : profile?.profilePic
                                            ? (profile.profilePic.startsWith('http') || profile.profilePic.startsWith('blob:')
                                                ? profile.profilePic
                                                : `${process.env.REACT_APP_API_URL}${profile.profilePic}`)
                                            : defaultAvatar
                                }
                                alt="avatar"
                                className="avatar mb-3 rounded-circle"
                                style={{ width: 120, height: 120, objectFit: 'cover' }}
                            />
                            <div className="d-flex justify-content-center gap-2">
                                <label className="btn btn-sm btn-outline-primary">
                                    {uploading ? "Uploading..." : "Change Picture"}
                                    <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                                </label>

                                {profile?.profilePic && (
                                    <button
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => setShowDeletePicModal(true)}
                                        disabled={uploading}
                                    >
                                        {uploading ? "Removing..." : "Remove"}
                                    </button>
                                )}
                            </div>
                            <h5 className="text-black mt-3 mb-1">{profile.name}</h5>
                            <p className="text-muted mb-0">{profile.role?.name || profile.role}</p>
                        </div>
                        <div className="col-md-8">
                            <form onSubmit={handleProfileSubmit}>
                                <div className="mb-3">
                                    <label className="form-label text-black">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={profile.name || ''}
                                        onChange={handleProfileChange}
                                        className="form-control input-dark"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-black">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={profile.email || ''}
                                        disabled
                                        className="form-control input-dark"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-black">Phone</label>
                                    <input
                                        type="text"
                                        name="phone"
                                        value={profile.phone || ''}
                                        onChange={handleProfileChange}
                                        className="form-control input-dark"
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-black">Role</label>
                                    <input
                                        type="text"
                                        value={profile.role?.name || profile.role}
                                        disabled
                                        className="form-control input-dark"
                                    />
                                </div>
                                <button type="submit" className="btn theme-btn mt-2" disabled={saving}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {tab === 'password' && (
                    <div className="col-md-8 mx-auto">
                        <form onSubmit={handlePasswordSubmit}>
                            <div className="mb-3">
                                <label className="form-label text-black">Current Password</label>
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    name="currentPassword"
                                    value={form.currentPassword}
                                    onChange={handlePasswordChange}
                                    className="form-control theme-input"
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label text-black">New Password</label>
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    name="newPassword"
                                    value={form.newPassword}
                                    onChange={handlePasswordChange}
                                    className="form-control theme-input"
                                    autoComplete="new-password"
                                />
                                <PasswordStrengthBar password={form.newPassword} />
                            </div>
                            <div className="mb-3">
                                <label className="form-label text-black">Confirm New Password</label>
                                <input
                                    type={showPasswords ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={handlePasswordChange}
                                    className="form-control theme-input"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="form-check mb-3">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="showPasswords"
                                    checked={showPasswords}
                                    onChange={() => setShowPasswords(!showPasswords)}
                                />
                                <label className="form-check-label text-black" htmlFor="showPasswords">
                                    Show Passwords
                                </label>
                            </div>
                            <button type="submit" className="btn theme-btn mt-2" disabled={changing}>
                                {changing ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            <CommonModal
                show={showDeletePicModal}
                onHide={() => setShowDeletePicModal(false)}
                title="Confirm Deletion"
                type="confirm-delete"
                emoji="🗑️"
                itemName="profile picture"
                confirmText="Delete"
                confirmVariant="danger"
                onConfirm={async () => {
                    try {
                        setUploading(true);
                        await deleteProfilePic(profile?._id);
                        toast.success('Profile picture deleted.');
                        setProfile(prev => ({ ...prev, profilePic: null }));
                    } catch (err) {
                        toast.error(err?.message || 'Failed to delete image.');
                    } finally {
                        setUploading(false);
                        setShowDeletePicModal(false);
                    }
                }}
            />
        </div>
    );
};

export default Profile;
