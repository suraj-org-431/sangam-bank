import { Link } from "react-router-dom";
import { adminRoute } from "../utils/router";
import logo from '../assets/images/logo.webp';
import { useAuth } from "../context/AuthContext";

const menuItems = [
    {
        label: "Dashboard",
        icon: "fa-solid fa-house",
        to: adminRoute("/dashboard"),
        roles: ["super-admin", "branch-manager", "account-officer"]
    },
    {
        label: "Roles",
        icon: "fa-solid fa-users",
        to: adminRoute("/roles"),
        roles: ["super-admin"]
    },
    {
        label: "Users",
        icon: "fa-solid fa-users",
        to: adminRoute("/users"),
        roles: ["super-admin"]
    },
    {
        label: "Accounts",
        icon: "fa-solid fa-landmark",
        to: adminRoute("/accounts"),
        roles: ["super-admin", "branch-manager", "account-officer"]
    },
    {
        label: "Transactions",
        icon: "fa-solid fa-clipboard",
        to: adminRoute("/transactions"),
        roles: ["super-admin", "branch-manager", "account-officer"]
    },
    {
        label: "Ledger",
        icon: "fa-solid fa-book",
        to: adminRoute("/ledger"),
        roles: ["super-admin", "branch-manager", "account-officer"]
    },
    {
        label: "Loans",
        icon: "fa-solid fa-money-check-dollar",
        to: adminRoute("/loans"),
        roles: ["super-admin", "branch-manager", "account-officer"]
    }
];

const Sidebar = () => {
    const { user } = useAuth(); // 👈 Get user from context
    const role = user?.roleType?.toLowerCase();
    if (!role) return null;
    return (
        <div className="container-fluid main-area">
            <div className="row g-0">
                <div className="col-sm-2">
                    <div className="sidebar">
                        <div className="logo">
                            <Link to={adminRoute("/dashboard")}>
                                <img src={logo} alt="logo" height={40} />
                            </Link>
                        </div>
                        <ul className="nav flex-column" id="sidebar">
                            {menuItems
                                .filter(item => item.roles.includes(role)) // ✅ Role-based filtering
                                .map((item, index) => (
                                    <li key={index} className="nav-item">
                                        <Link className="nav-link" to={item.to}>
                                            <i className={item.icon}></i>
                                            <span className="nav-link-text">{item.label}</span>
                                        </Link>
                                    </li>
                                ))}
                        </ul>
                    </div>
                </div>
                <div className="col-sm-10"></div>
            </div>
        </div>
    );
};


export default Sidebar;