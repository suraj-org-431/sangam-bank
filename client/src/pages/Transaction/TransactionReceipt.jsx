import React from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useLocation } from "react-router-dom";
import { format } from "date-fns";

const TransactionReceipt = () => {

    const typeLabels = {
        deposit: "Deposit",
        withdrawal: "Withdrawal",
        transfer: "Transfer",
        loanRepayment: "Loan Repayment",
        loanDisbursed: "Loan Disbursed",
        rdInstallment: "RD Installment",
        adjustment: "Adjustment",
        principal: "Principal",
        fine: "Fine",
        interestPayment: "Interest Payment"
    };

    const location = useLocation();
    const { transaction } = location?.state;
    const handleDownloadPDF = async () => {
        const receipt = document.getElementById("receipt");
        const canvas = await html2canvas(receipt, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("transaction-receipt.pdf");
    };

    const handlePrint = () => {
        const content = document.getElementById("receipt").innerHTML;
        const win = window.open("", "", "width=800,height=600");
        win.document.write("<html><head><title>Print Receipt</title></head><body>");
        win.document.write(content);
        win.document.write("</body></html>");
        win.document.close();
        win.focus();
        win.print();
    };

    return (
        <div className="px-4 py-4">
            <div className="card theme-card border-0 shadow p-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
                    <h4 className="theme-text">Transaction Receipt</h4>
                    <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-primary" onClick={handleDownloadPDF}>Download PDF</button>
                        <button className="btn btn-sm btn-secondary" onClick={handlePrint}>Print</button>
                    </div>
                </div>

                <div className="d-flex justify-content-center">
                    <div
                        id="receipt"
                        style={{
                            width: "500px",
                            padding: "20px",
                            border: "1px solid #ccc",
                            fontFamily: "Arial, sans-serif",
                            backgroundColor: "#fff"
                        }}
                    >
                        <h2 style={{ textAlign: "center" }}>Transaction Receipt</h2>
                        <hr />
                        <table style={{ width: "100%", marginBottom: "20px" }}>
                            <tbody>
                                <tr><td><strong>Receipt No:</strong></td><td>#{transaction?.transactionNo}</td></tr>
                                <tr><td><strong>Date:</strong></td><td>{format(new Date(transaction.date), 'dd-MMM-yyyy')}</td></tr>
                                <tr><td><strong>Transaction Type:</strong></td><td>{typeLabels[transaction?.type] || transaction?.type}</td></tr>
                                <tr><td><strong>Account Holder:</strong></td><td>{transaction?.accountId?.applicantName}</td></tr>
                                <tr><td><strong>Account Number:</strong></td><td>{transaction?.accountId?.accountNumber}</td></tr>
                                <tr><td><strong>Amount:</strong></td><td>₹{transaction?.amount}</td></tr>
                                <tr><td><strong>Balance After Transaction:</strong></td><td>₹{transaction?.accountId?.balance}</td></tr>
                                <tr><td><strong>Remarks:</strong></td><td>{transaction?.description}</td></tr>
                            </tbody>
                        </table>

                        <hr />
                        <div style={{ textAlign: "right", marginTop: "30px" }}>
                            <p>Authorized By: __________________</p>
                        </div>
                        <p style={{ textAlign: "center", fontSize: "12px", marginTop: "20px" }}>
                            This is a system generated receipt. No signature required.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionReceipt;
