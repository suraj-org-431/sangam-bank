import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const CommonModal = ({
    show,
    onHide,
    title = 'Modal Title',
    body = 'Are you sure?',
    onConfirm,
    confirmText = 'OK',
    cancelText = 'Cancel',
    confirmVariant = 'primary',
    footer = true,
    children,
    emoji = null,
    type = null, // 'access-denied', 'confirm-delete', or null
    itemName = '',
}) => {
    const renderAccessDenied = () => (
        <div className="text-center py-4">
            <div style={{ fontSize: '4rem' }}>{emoji || '🚫'}</div>
            <h5 className="mt-3 text-danger fw-bold">403 - Forbidden</h5>
            <p className="text-muted">
                You don't have permission to access this resource or perform this action.
            </p>
            <Button variant="outline-danger" onClick={onHide} className='btn theme-btn'>
                Go Back
            </Button>
        </div>
    );

    const renderDeleteConfirmation = () => (
        <div className="text-center py-3">
            <div style={{ fontSize: '3rem' }}>{emoji || '🗑️'}</div>
            <p className="mt-3">
                Are you sure you want to delete <strong>{itemName}</strong>?
            </p>
            <div className="d-flex justify-content-center gap-2 mt-3">
                <Button variant="secondary" onClick={onHide}>
                    {cancelText}
                </Button>
                <Button variant={confirmVariant} onClick={onConfirm}>
                    {confirmText}
                </Button>
            </div>
        </div>
    );

    return (
        <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false}>
            <Modal.Header closeButton>
                <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {type === 'access-denied'
                    ? renderAccessDenied()
                    : type === 'confirm-delete'
                        ? renderDeleteConfirmation()
                        : emoji ? (
                            <div className="text-center py-4">
                                <div style={{ fontSize: '4rem' }}>{emoji}</div>
                                <div className="mt-3">{body}</div>
                            </div>
                        ) : (
                            children || <p>{body}</p>
                        )
                }
            </Modal.Body>
            {footer && !['access-denied', 'confirm-delete'].includes(type) && (
                <Modal.Footer>
                    <button className='btn theme-btn' variant="secondary" onClick={onHide}>{cancelText}</button>
                    <button className='btn theme-btn' variant={confirmVariant} onClick={onConfirm}>{confirmText}</button>
                </Modal.Footer>
            )}
        </Modal>
    );
};

export default CommonModal;
