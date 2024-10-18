import React, { useState } from 'react';
import '../Styles/Header.css';

const Header = ({ openProfessionalModal, openServiceModal, openScheduleModal, openRegisterBoxModal, openProductModal }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = () => {
        setMenuOpen(!menuOpen);
    };

    // Funções que fecham o menu e abrem os respectivos modais
    const handleOpenScheduleModal = () => {
        setMenuOpen(false);  // Fecha o menu
        openScheduleModal(); // Abre o modal de agendar cliente
    };

    const handleOpenProfessionalModal = () => {
        setMenuOpen(false);  // Fecha o menu
        openProfessionalModal(); // Abre o modal de adicionar profissional
    };

    const handleOpenServiceModal = () => {
        setMenuOpen(false);  // Fecha o menu
        openServiceModal(); // Abre o modal de adicionar serviço
    };

    const handleOpenRegisterBoxModal = () => {
        setMenuOpen(false);  // Fecha o menu
        openRegisterBoxModal(); // Abre o modal do caixa
    };

    const handleOpenProductModal = () => {
        setMenuOpen(false);  // Fecha o menu
        openProductModal(); // Abre o modal de adicionar produto
    }

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

            {/* Modal menu abaixo do ícone de hambúrguer */}
            {menuOpen && <div className="overlay" onClick={toggleMenu}></div>}

            <div className={`header-actions ${menuOpen ? 'active' : ''}`}>
                <button className="action-btn" onClick={handleOpenScheduleModal}>Agendar Cliente</button>
                <button className="action-btn" onClick={handleOpenProfessionalModal}>Adicionar Profissional</button>
                <button className="action-btn" onClick={handleOpenServiceModal}>Adicionar Serviço</button>
                <button className="action-btn" onClick={handleOpenProductModal}>Adicionar Produto</button>
                <button className="action-btn" onClick={handleOpenRegisterBoxModal}>Caixa</button>
            </div>
        </header>
    );
};

export default Header;
