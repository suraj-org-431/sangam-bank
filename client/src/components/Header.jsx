import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import defaultAvatar from '../assets/images/pic3.webp';
import { adminRoute } from "../utils/router";
import { getUnreadNotifications, markAsRead } from "../api/notification";
import { getUnreadMessages } from "../api/message";
import { toast } from "react-toastify";
import { useProfile } from "../context/ProfileContext";
import { useAuth } from "../context/AuthContext";

const AdminHeader = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [messages, setMessages] = useState([]);
    const [profile, setProfile] = useProfile();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [notifRes, messageRes] = await Promise.all([
                    getUnreadNotifications(),
                    getUnreadMessages()
                ]);
                setNotifications(notifRes?.data || []);
                setMessages(messageRes?.data || []);
            } catch (err) {
                console.error("Header fetch error:", err);
            }
        };
        fetchData();
    }, []);

    const handleLogout = () => {
        logout();
        navigate(adminRoute('/login'));
        window.location.reload();
    };

    const toggleRead = async (id) => {
        try {
            await markAsRead(id);
            await getUnreadNotifications();
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <header className="top-header py-2">
            <div className="container-fluid">
                <div className="d-flex justify-content-end align-items-center">
                    {/* Left: Logo */}
                    {/* <div className="logo">
                        <Link to={adminRoute("/dashboard")}>
                            <img src={logo} alt="logo" height={40} />
                        </Link>
                    </div> */}

                    {/* Right: Country + Notifications + Messages + User */}

                    <div className='d-flex align-items-center gap-3 me-3'>
                        <Link to={adminRoute('/transaction/create')} className='btn btn-sm btn-primary'>
                            <i className='fa-solid fa-building-columns me-2'></i> Add New Transaction
                        </Link>
                        <Link to={adminRoute('/account/create')} className='btn btn-sm btn-primary'>
                            <i className="fa-solid fa-user-plus me-1"></i> Add New Account
                        </Link>
                    </div>

                    <div className='d-flex align-items-center gap-3'>

                        {/* Country Selector */}
                        {/* <input type="text" className='form-control' placeholder="Search Account..." /> */}

                        {/* Notifications */}
                        <div className="dropdown dropdown_notification">
                            <button className="btn btn_circle position-relative" data-bs-toggle="dropdown">
                                <i className="fa-regular fa-bell"></i>
                                {notifications.length > 0 && (
                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                        {notifications?.length}
                                    </span>
                                )}
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end p-2" style={{ minWidth: '250px', maxHeight: '300px', overflowY: 'auto' }}>
                                <li className="dropdown-header fw-bold">Notifications</li>
                                {notifications.length > 0 ? (
                                    notifications.map((note, idx) => (
                                        <li key={idx} onClick={() => toggleRead(note?._id)}>
                                            <div className="dropdown-item">
                                                {note.title}
                                                <small>{note.body}</small>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="dropdown-item text-light">No new notifications</li>
                                )}
                                <li><hr className="dropdown-divider" /></li>
                                <li><Link className="dropdown-item text-center" to={adminRoute("/notifications")}>See all</Link></li>
                            </ul>
                        </div>

                        {/* Messages */}
                        <div className="dropdown">
                            <button className="btn btn_circle position-relative" data-bs-toggle="dropdown">
                                <i className="fa-regular fa-message"></i>
                                {messages.length > 0 && (
                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-success">
                                        {messages.length}
                                    </span>
                                )}
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end p-2" style={{ minWidth: '250px', maxHeight: '300px', overflowY: 'auto' }}>
                                <li className="dropdown-header fw-bold">Messages</li>
                                <li><hr className="dropdown-divider" /></li>
                                {messages.length > 0 ? (
                                    messages.map((msg, idx) => (
                                        <li key={idx}>
                                            <div className="dropdown-item theme-text">
                                                <strong>{msg.fromUser?.name || 'Unknown'}:</strong><br />
                                                <small className="text-muted">{msg.content}</small>
                                            </div>
                                        </li>
                                    ))
                                ) : (
                                    <li className="dropdown-item text-muted">No new messages</li>
                                )}
                                <li><hr className="dropdown-divider" /></li>
                                <li><Link className="dropdown-item text-center" to={adminRoute("/messages")}>View all messages</Link></li>
                            </ul>
                        </div>

                        {/* User Profile */}
                        <div className="dropdown">
                            <button className="btn p-0 border-0 bg-transparent" data-bs-toggle="dropdown">
                                <img
                                    src={
                                        profile?.profilePic
                                            ? (profile.profilePic.startsWith('http')
                                                ? profile.profilePic
                                                : `${process.env.REACT_APP_API_URL}${profile.profilePic}`)
                                            : defaultAvatar
                                    }
                                    alt="user"
                                    className="profile-avatar"
                                />
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li><Link className="dropdown-item" to={adminRoute("/user-profile")}>Profile</Link></li>
                                <li><Link className="dropdown-item" to={adminRoute("/system-settings")}>Settings</Link></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><Link className="dropdown-item" components="button" onClick={handleLogout}>Logout</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
