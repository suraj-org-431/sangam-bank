import { Link } from "react-router-dom";
import { adminRoute } from "../utils/router";
import logo from '../assets/images/logo.webp';
const Sidebar = () => {
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
                            <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Dashboard">
                                <Link className="nav-link" to={adminRoute('/dashboard')}>
                                    <i className="fa-solid fa-house"></i>
                                    <span className="nav-link-text">Dashboard</span>
                                </Link >
                            </li>

                            <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Business">
                                <Link className="nav-link" to={adminRoute('/roles')}>
                                    <i className="fa-solid fa-users"></i>
                                    <span className="nav-link-text">Roles</span>
                                </Link >
                            </li>

                            <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Business">
                                <Link className="nav-link" to={adminRoute('/users')}>
                                    <i className="fa-solid fa-users"></i>
                                    <span className="nav-link-text">Users</span>
                                </Link >
                            </li>

                            <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Business">
                                <Link className="nav-link" to={adminRoute('/accounts')}>
                                    <i className="fa-solid fa-landmark"></i>
                                    <span className="nav-link-text">Accounts</span>
                                </Link >
                            </li>

                            <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Business">
                                <Link className="nav-link" to={adminRoute('/transactions')}>
                                    <i className="fa-solid fa-clipboard"></i>
                                    <span className="nav-link-text">Transactions</span>
                                </Link >
                            </li>

                            <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Business">
                                <Link className="nav-link" to={adminRoute('/ledger-report')}>
                                    <i className="fa-solid fa-book"></i>
                                    <span className="nav-link-text">Ledger</span>
                                </Link >
                            </li>

                            <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Business">
                                <Link className="nav-link" to={adminRoute('/loans')}>
                                    <i className="fa-solid fa-money-check-dollar"></i>
                                    <span className="nav-link-text">Loans</span>
                                </Link >
                            </li>

                            {/* <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Business">
                                <Link className="nav-link" to={adminRoute('/daily-expenses')}>
                                    <i className="fa-solid fa-chart-pie"></i>
                                    <span className="nav-link-text">Daily Expenses</span>
                                </Link >
                            </li>

                            <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Business">
                                <Link className="nav-link" to={adminRoute('/assets')}>
                                    <i className="fa-solid fa-square-poll-vertical"></i>
                                    <span className="nav-link-text">Assets</span>
                                </Link >
                            </li>
                            <li className="nav-item" data-toggle="tooltip" data-placement="right" title="Business">
                                <Link className="nav-link" to={adminRoute('/reports')}>
                                    <i className="fa-solid fa-folder"></i>
                                    <span className="nav-link-text">Reports</span>
                                </Link >
                            </li> */}
                        </ul>
                    </div>
                </div>
                <div className="col-sm-10"></div>
            </div>
        </div>
    )
}

export default Sidebar;