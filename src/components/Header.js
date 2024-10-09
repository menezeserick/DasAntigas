import React from 'react';
import '../Styles/Header.css';

const Header = ({ openProfessionalModal, openServiceModal, openScheduleModal, openRegisterBoxModal }) => {
    return (
        <header className="dashboard-header">
            <div className="logo-container">
                <h1 className="title">SistemaDasAntigas</h1>
            </div>
            <div className="header-actions">
                <button className="action-btn" onClick={openScheduleModal}>Agendar Cliente</button>
                <button className="action-btn" onClick={openProfessionalModal}>Adicionar Profissional</button>
                <button className="action-btn" onClick={openServiceModal}>Adicionar Serviço</button>
                <button className="action-btn" onClick={openRegisterBoxModal}>Abrir Caixa</button>
            </div>
        </header>
    );
};

export default Header;
