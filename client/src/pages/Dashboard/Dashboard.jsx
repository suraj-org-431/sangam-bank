import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminRoute } from '../../utils/router';

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Any logic here
  }, []);

  const transactions = [
    { id: 1, date: "2025-07-01", type: "Deposit", amount: 5000, status: "Success", account: "SB-00123" },
    { id: 2, date: "2025-07-02", type: "Withdraw", amount: 2000, status: "Pending", account: "SB-00124" },
    { id: 3, date: "2025-07-03", type: "Deposit", amount: 10000, status: "Success", account: "SB-00125" },
    { id: 4, date: "2025-07-04", type: "Withdraw", amount: 1500, status: "Failed", account: "SB-00126" },
    { id: 5, date: "2025-07-05", type: "Deposit", amount: 3000, status: "Success", account: "SB-00127" },
    { id: 6, date: "2025-07-06", type: "Withdraw", amount: 2500, status: "Success", account: "SB-00128" },
    { id: 7, date: "2025-07-07", type: "Deposit", amount: 4000, status: "Pending", account: "SB-00129" },
    { id: 8, date: "2025-07-08", type: "Withdraw", amount: 1200, status: "Success", account: "SB-00130" },
    { id: 9, date: "2025-07-09", type: "Deposit", amount: 8000, status: "Success", account: "SB-00131" },
    { id: 10, date: "2025-07-10", type: "Withdraw", amount: 1000, status: "Failed", account: "SB-00132" },
  ];

  return (
    <div className="dashboard-wrapper px-4 py-4 theme-bg mt-3">
      <div className="row">
        {/* Cards */}
         <div className='col-sm-3'>
              <div className='card dash_card'>
                <div className='card-header'>
                   <div>
                     <h4>Account Openings</h4> 
                    <i class="fa-solid fa-receipt"></i>
                  </div>
                </div>
                <div className='card-body'>
                   <div className='lg-text'>
                    <i class="fa-solid fa-users"></i>
                      <span>1000+</span> 
                    </div>
                </div> 
                <div className='card-footer'>
                    <a href='#'>View Details 
                        <i class="fa-solid fa-eye ms-2"></i>
                    </a>
                </div>
             </div>
            </div>


            <div className='col-sm-3'>
              <div className='card dash_card'>
                <div className='card-header'>
                   <div>
                     <h4>Opening Balance</h4> 
                    <i class="fa-solid fa-folder-open"></i>
                  </div>
                </div>
                <div className='card-body'>
                   <div className='lg-text'>
                    <i class="fa-solid fa-indian-rupee-sign"></i>
                     <span>13,340123.00</span>
                    </div>
                </div> 
                <div className='card-footer'>
                    <a href='#'>View 
                        <i class="fa-solid fa-eye ms-2"></i>
                    </a>
                </div>
             </div>
            </div>

            <div className='col-sm-3'>
              <div className='card dash_card'>
                <div className='card-header'>
                   <div>
                     <h4>Closing Balance</h4> 
                    <i class="fa-solid fa-folder"></i>
                  </div>
                </div>
                <div className='card-body'>
                   <div className='lg-text'>
                    <i class="fa-solid fa-indian-rupee-sign"></i>
                     <span>14,340123.00</span>
                    </div>
                </div> 
                <div className='card-footer'>
                    <a href='#'>View 
                        <i class="fa-solid fa-eye ms-2"></i>
                    </a>
                </div>
             </div>
            </div>


            <div className='col-sm-3'>
              <div className='card dash_card'>
                <div className='card-header'>
                   <div>
                     <h4>Ledger</h4> 
                      <i class="fa-solid fa-file"></i>
                  </div>
                </div>
                <div className='card-body'>
                   <div className='lg-text'>
                    <i class="fa-solid fa-indian-rupee-sign"></i>
                     <span>14,340123.00</span>
                    </div>
                </div> 
                <div className='card-footer'>
                    <a href='ledger'>View Details 
                       <i class="fa-solid fa-eye ms-2"></i>
                       </a>
                </div>
             </div>
            </div>


        {/* Repeat for other 3 cards with different icons & content */}

      </div>

      {/* Transactions Table */}
      <div className="card theme-card border-0 shadow p-3 mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0 theme-text">Recent Transactions</h4>
        </div>
        <div className="table-responsive mt-2">
          <table className="table table-bordered theme-table">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Account No.</th>
                <th>Transaction Type</th>
                <th>Amount (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr key={tx.id}>
                  <td>{index + 1}</td>
                  <td>{tx.date}</td>
                  <td>{tx.account}</td>
                  <td>
                    <span className={`badge ${tx.type === "Deposit" ? "bg-success" : "bg-danger"}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td>₹{tx.amount.toLocaleString()}</td>
                  <td>
                    <span className={`badge 
                      ${tx.status === "Success" ? "bg-success" : 
                        tx.status === "Pending" ? "bg-warning text-dark" : "bg-danger"}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
