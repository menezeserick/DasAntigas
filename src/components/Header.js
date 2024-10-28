import React, { useState } from 'react';
import '../Styles/Header.css';

const Header = ({ 
    openProfessionalModal, 
    openServiceModal, 
    openScheduleModal, 
    openRegisterBoxModal, 
    openProductModal, 
    currentUserUID 
}) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    const handleOpenScheduleModal = () => {
        setMenuOpen(false);  
        openScheduleModal(); 
    };

    const handleOpenProfessionalModal = () => {
        setMenuOpen(false);
        openProfessionalModal(); 
    };

    const handleOpenServiceModal = () => {
        setMenuOpen(false); 
        openServiceModal(); 
    };

    const handleOpenRegisterBoxModal = () => {
        setMenuOpen(false); 
        openRegisterBoxModal(); 
    };

    const handleOpenProductModal = () => {
        setMenuOpen(false); 
        openProductModal(); 
    };

    // UID restrito
    const restrictedUID = "8IBGORDnkaR6CFaxmyVVlGsNiC13";

    return (
        <header className="dashboard-header">
            <div className="logo-container">
                <h1 className="title">SistemaDasAntigas</h1>
            </div>

            <div className={`hamburger-icon ${menuOpen ? 'open' : ''}`} onClick={toggleMenu}>
                <span className="bar"></span>
                <span className="bar"></span>
                <span className="bar"></span>
            </div>
            {menuOpen && <div className="overlay" onClick={toggleMenu}></div>}

            <div className={`header-actions ${menuOpen ? 'active' : ''}`}>
                <button className="action-btn" onClick={handleOpenScheduleModal}>Agendar Cliente</button>
                
                {currentUserUID !== restrictedUID && (
                    <>
                        <button className="action-btn" onClick={handleOpenProfessionalModal}>Profissionais</button>
                        <button className="action-btn" onClick={handleOpenServiceModal}>Serviços</button>
                        <button className="action-btn" onClick={handleOpenProductModal}>Produtos</button>
                        <button className="action-btn" onClick={handleOpenRegisterBoxModal}>Caixa</button>
                    </>
                )}
            </div>
        </header>
    );
};

export default Header;
