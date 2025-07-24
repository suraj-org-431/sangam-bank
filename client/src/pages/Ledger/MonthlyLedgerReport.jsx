import React from 'react';
import SummaryTable from './SummaryTable';

const MonthlyLedgerTable = ({ categorizedEntry, openingBalance, closingBalance, totalEntries, month, year }) => {
    const formatAmount = (amount) =>
        amount !== null && amount !== undefined
            ? new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                minimumFractionDigits: 2,
            }).format(typeof amount === 'string' ? parseFloat(amount.replace(/[^0-9.-]+/g, '')) : amount)
            : '-';

    return (
        <div className="container-fluid">
            {/* Summary Section */}
            <div className='row'>
                <div className='col-md-3'>
                    <div className='alert alert-warning bank_info'>
                        <label className='text-black border-bottom mb-2 text-muted fw-bold'>Opening Balance</label>
                        <div><i className="fa-solid fa-rupee me-2"></i><b>{formatAmount(openingBalance)}</b></div>
                    </div>
                </div>
                <div className='col-md-3'>
                    <div className='alert alert-warning bank_info'>
                        <label className='text-black border-bottom mb-2 text-muted fw-bold'>Closing Balance</label>
                        <div><i className="fa-solid fa-rupee me-2"></i><b>{formatAmount(closingBalance)}</b></div>
                    </div>
                </div>
                <div className='col-md-3'>
                    <div className='alert alert-warning bank_info'>
                        <label className='text-black border-bottom mb-2 text-muted fw-bold'>Total Entries</label>
                        <div><i className="fa-solid fa-layer-group me-2"></i><b>{totalEntries}</b></div>
                    </div>
                </div>
                <div className='col-md-3'>
                    <div className='alert alert-warning bank_info'>
                        <label className='text-black border-bottom mb-2 text-muted fw-bold'>Month</label>
                        <div><i className="fa-solid fa-calendar me-2"></i><b>{new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}</b></div>
                    </div>
                </div>
            </div>

            <div className='border my-4'></div>

            {/* Summary Tables */}
            <SummaryTable categorizedEntry={categorizedEntry} />

        </div>
    );
};

export default MonthlyLedgerTable;
