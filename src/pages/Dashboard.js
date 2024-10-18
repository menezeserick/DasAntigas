import React, { useState, useEffect } from 'react';
import Calendario from '../components/Calendario';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../Styles/Dashboard.css';
import moment from 'moment-timezone';
import Header from '../components/Header';
import { FaEdit, FaTrash } from 'react-icons/fa';

const Dashboard = () => {
    const [events, setEvents] = useState([]);
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [modalProfessionalOpen, setModalProfessionalOpen] = useState(false);
    const [modalServiceOpen, setModalServiceOpen] = useState(false);
    const [modalRegisterBoxOpen, setModalRegisterBoxOpen] = useState(false);
    const [professionals, setProfessionals] = useState([]);
    const [services, setServices] = useState([]);
    const [paymentMethods] = useState([]);
    const [professionalBalances, setProfessionalBalances] = useState([]);
    const [selectedTimes, setSelectedTimes] = useState([]);
    const [boxValue, setBoxValue] = useState(0); // Estado para valor do caixa
    const [adjustmentValue, setAdjustmentValue] = useState('');
    const [modalProductOpen, setModalProductOpen] = useState(false);
    const [productName, setProductName] = useState('');
    const [productCost, setProductCost] = useState('');
    const [productSalePrice, setProductSalePrice] = useState('');
    const [modalSalesDetailsOpen, setModalSalesDetailsOpen] = useState(false);
    const [salesData, setSalesData] = useState([]);
    const [productQuantity, setProductQuantity] = useState('');
    const [stockData, setStockData] = useState([]);
    const [isModalStockDetailsOpen, setModalStockDetailsOpen] = useState(false);  // Default to closed
    const [formData, setFormData] = useState({
        clientName: '',
        title: '',
        professional: '',
        date: '',
        time: ''
    });

    const [isEditProductModalOpen, setEditProductModalOpen] = useState(false);
    const [editProductData, setEditProductData] = useState({
        id: '',
        name: '',
        costPrice: '',
        salePrice: '',
        stock: ''
    });

    const openModal = () => setModalIsOpen(true);
    const closeModal = () => setModalIsOpen(false);
    const openProfessionalModal = () => setModalProfessionalOpen(true);
    const closeProfessionalModal = () => setModalProfessionalOpen(false);
    const openServiceModal = () => setModalServiceOpen(true);
    const closeServiceModal = () => setModalServiceOpen(false);
    const openProductModal = () => setModalProductOpen(true);
    const closeProductModal = () => setModalProductOpen(false);
    const closeRegisterBoxModal = () => setModalRegisterBoxOpen(false);


    const handleEditProduct = (product) => {
        closeStockDetailsModal();

        setEditProductData({
            id: product.id,
            name: product.name,
            costPrice: product.costPrice,
            salePrice: product.salePrice,
            stock: product.stock
        });
        setEditProductModalOpen(true);
    };

    const openRegisterBoxModal = async () => {
        setModalRegisterBoxOpen(true);
        await handleOpenBox();
    };

    const handleOpenStockDetails = async () => {
        try {
            // Consultar o banco de dados para obter os produtos do estoque
            const q = query(collection(db, "products"));
            const querySnapshot = await getDocs(q);

            const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(products);
            setStockData(products); // Definir os dados do estoque
            setModalStockDetailsOpen(true); // Abrir o modal
        } catch (error) {
            console.error("Erro ao carregar o estoque: ", error);
        }
    };

    // Função para fechar o modal de estoque
    const closeStockDetailsModal = () => {
        setModalStockDetailsOpen(false);
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
    
        const { id, name, costPrice, salePrice, stock } = editProductData;
    
        try {
            await updateDoc(doc(db, "products", id), {
                name,
                costPrice: parseFloat(costPrice),
                salePrice: parseFloat(salePrice),
                stock: parseInt(stock, 10)
            });
    
            // Atualizar os dados na tabela
            setStockData(stockData.map(product => 
                product.id === id ? { ...product, name, costPrice: parseFloat(costPrice), salePrice: parseFloat(salePrice), stock: parseInt(stock, 10) } : product
            ));
    
            // Limpar campos e fechar modal de edição
            setEditProductModalOpen(false);
            setEditProductData({ id: '', name: '', costPrice: '', salePrice: '', stock: '' });
    
            // Reabrir o modal de estoque
            handleOpenStockDetails(); // Chama a função que abre o modal de estoque
    
            console.log("Produto atualizado com sucesso.");
        } catch (error) {
            console.error("Erro ao atualizar produto: ", error);
        }
    };

    const handleDeleteProduct = async (productId) => {
        const confirmDelete = window.confirm("Você tem certeza que deseja excluir este produto?");
        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, "products", productId)); // Exclui o produto
                // Atualizar a lista de produtos no estado
                setStockData(stockData.filter(product => product.id !== productId));
                console.log("Produto excluído com sucesso");
            } catch (error) {
                console.error("Erro ao excluir produto: ", error);
            }
        }
    };
    
    

    const handleOpenSalesDetails = async () => {
        try {
            // Fechar o modal de caixa
            closeRegisterBoxModal();

            // Consultar o banco de dados para obter as vendas
            const q = query(collection(db, "vendas"));
            const querySnapshot = await getDocs(q);

            const sales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSalesData(sales);
            setModalSalesDetailsOpen(true); // Abrir o modal após carregar as vendas
        } catch (error) {
            console.error("Erro ao carregar vendas: ", error);
        }
    };

    // Função para fechar o modal de vendas detalhadas
    const closeSalesDetailsModal = () => {
        setModalSalesDetailsOpen(false);
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();

        if (!productName || !productCost || !productSalePrice || !productQuantity) {
            alert("Por favor, preencha todos os campos.");
            return;
        }

        try {
            await addDoc(collection(db, "products"), {
                name: productName,
                costPrice: parseFloat(productCost),
                salePrice: parseFloat(productSalePrice),
                stock: parseInt(productQuantity, 10)
            });

            // Limpar campos após salvar
            setProductName('');
            setProductCost('');
            setProductSalePrice('');
            setProductQuantity('');

            closeProductModal();
            console.log("Produto adicionado com sucesso.");
        } catch (error) {
            console.error("Erro ao adicionar produto: ", error);
        }
    };

    // Função para abrir o caixa e carregar o saldo do dia anterior
    const handleOpenBox = async () => {
        try {
            const today = moment().format('YYYY-MM-DD');
            let initialBoxValue = 0;

            // Verificar se já existe um caixa para o dia atual
            const querySnapshot = await getDocs(collection(db, "boxes"));
            const existingBox = querySnapshot.docs.find(doc => doc.data().date === today);

            if (existingBox) {
                const boxData = existingBox.data();
                const professionalBalancesFromBox = boxData.professionals;
                setProfessionalBalances(professionalBalancesFromBox);
                setBoxValue(boxData.boxValue || initialBoxValue);  // Usar o valor existente, se houver
                console.log("Caixa já registrado hoje. Exibindo os dados.");
            } else {
                const professionalSnapshot = await getDocs(collection(db, "professionals"));
                const professionalData = professionalSnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    balance: parseFloat(doc.data().balance) || 0
                }));

                setProfessionalBalances(professionalData);

                // Criar novo registro do caixa para o dia atual, com o valor inicial do dia anterior
                await addDoc(collection(db, "boxes"), {
                    date: today,
                    professionals: professionalData,
                    boxValue: initialBoxValue  // Inicializar com o valor do dia anterior
                });

                console.log("Caixa registrado com sucesso.");
            }
        } catch (error) {
            console.error("Erro ao abrir o caixa: ", error);
        }
    };

    const handleAdjustMoney = async () => {
        const valueToAdjust = parseFloat(adjustmentValue); // Pode ser positivo ou negativo
        if (isNaN(valueToAdjust)) {
            alert("Por favor, insira um valor válido.");
            return;
        }

        const newBoxValue = boxValue + valueToAdjust; // Adiciona ou subtrai o valor do caixa
        setBoxValue(newBoxValue);

        try {
            const today = moment().format('YYYY-MM-DD');
            const querySnapshot = await getDocs(collection(db, "boxes"));
            const boxDoc = querySnapshot.docs.find(doc => doc.data().date === today);
            if (boxDoc) {
                await updateDoc(doc(db, "boxes", boxDoc.id), { boxValue: newBoxValue });
                console.log(`Caixa atualizado para R$ ${newBoxValue}`);
            }
        } catch (error) {
            console.error("Erro ao atualizar o valor do caixa: ", error);
        }

        setAdjustmentValue('');  // Limpar o campo de ajuste
    };


    // Função para controlar as mudanças no input de ajuste de caixa
    const handleBoxInputChange = (e) => {
        setAdjustmentValue(e.target.value);
    };

    // Função para controle de input dos dados do formulário
    const handleFormInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleAddTime = () => {
        if (!formData.time) return;

        setSelectedTimes((prevTimes) => [...prevTimes, formData.time]);
        setFormData({
            ...formData,
            time: '',
        });
    };

    const handleRemoveTime = (timeToRemove) => {
        setSelectedTimes((prevTimes) => prevTimes.filter(time => time !== timeToRemove));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        try {
            const professional = professionals.find(p => p.title === formData.professional);
            if (!professional) {
                console.error("Profissional não encontrado!");
                return;
            }

            const newEvents = selectedTimes.map(time => {
                const [hours, minutes] = time.split(":");
                const start = moment.tz(`${formData.date} ${hours}:${minutes}`, "YYYY-MM-DD HH:mm", "America/Sao_Paulo").toDate();
                const end = moment(start).add(30, 'minutes').toDate();

                return {
                    title: `${formData.clientName} - ${formData.title}`,
                    start: start,
                    end: end,
                    resourceId: professional.id
                };
            });

            for (const event of newEvents) {
                const querySnapshot = await getDocs(collection(db, "schedules"));

                const conflictingEventDoc = querySnapshot.docs.find(doc => {
                    const data = doc.data();
                    const eventStart = moment.tz(`${data.date} ${data.time}`, "YYYY-MM-DD HH:mm", "America/Sao_Paulo").toDate();
                    return eventStart.getTime() === event.start.getTime() && data.professional === formData.professional;
                });

                if (conflictingEventDoc) {
                    // Aviso de conflito
                    const confirmation = window.confirm("Já existe um agendamento nesse horário. Deseja substituir?");
                    if (confirmation) {
                        // Substitui o agendamento existente
                        await deleteDoc(doc(db, "schedules", conflictingEventDoc.id)); // Deleta o agendamento conflitante

                        await addDoc(collection(db, "schedules"), {
                            clientName: formData.clientName,
                            service: formData.title,
                            professional: formData.professional,
                            date: moment(event.start).format("YYYY-MM-DD"),
                            time: moment(event.start).format("HH:mm")
                        });

                        window.location.reload();

                        console.log("Agendamento substituído com sucesso.");
                    } else {
                        console.log("O agendamento não foi substituído.");
                    }
                } else {
                    // Adiciona o novo agendamento, já que não há conflito
                    await addDoc(collection(db, "schedules"), {
                        clientName: formData.clientName,
                        service: formData.title,
                        professional: formData.professional,
                        date: moment(event.start).format("YYYY-MM-DD"),
                        time: moment(event.start).format("HH:mm")
                    });
                }
            }

            // Atualiza os eventos exibidos no calendário
            setEvents((prevEvents) => [...prevEvents, ...newEvents]);

            closeModal();
            setSelectedTimes([]);
        } catch (error) {
            console.error("Erro ao adicionar agendamento: ", error);
        }
    };

    const handleAddProfessional = async (e) => {
        e.preventDefault();
        const name = e.target.professionalName.value;

        try {
            await addDoc(collection(db, "professionals"), { name });
            const newProfessional = { id: professionals.length + 1, title: name };
            setProfessionals([...professionals, newProfessional]);
            closeProfessionalModal();
        } catch (error) {
            console.error("Erro ao adicionar profissional: ", error);
        }
    };

    const handleAddService = async (e) => {
        e.preventDefault();

        const serviceName = e.target.serviceName.value;
        const servicePrice = parseFloat(e.target.servicePrice.value);

        if (!serviceName || isNaN(servicePrice)) {
            console.error("Nome ou preço do serviço estão ausentes.");
            return;
        }
        try {
            await addDoc(collection(db, "services"), {
                name: serviceName,
                price: servicePrice,
            });
            setServices([...services, { name: serviceName, price: servicePrice }]);
            closeServiceModal();
        } catch (error) {
            console.error("Erro ao adicionar serviço: ", error);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "professionals"));
                const firestoreProfessionals = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    title: doc.data().name,
                }));
                setProfessionals(firestoreProfessionals);

                const serviceSnapshot = await getDocs(collection(db, "services"));
                const firestoreServices = serviceSnapshot.docs.map(doc => ({
                    name: doc.data().name,
                }));
                setServices(firestoreServices);
            } catch (error) {
                console.error("Erro ao buscar os dados: ", error);
            }
        };

        fetchData();
    }, []);


    useEffect(() => {
        const fetchData = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "schedules"));
                const firestoreEvents = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const start = moment.tz(`${data.date} ${data.time}`, "YYYY-MM-DD HH:mm", "America/Sao_Paulo").toDate();
                    const end = moment(start).add(30, 'minutes').toDate();

                    return {
                        title: `${data.clientName} - ${data.service}`,
                        start: start,
                        end: end,
                        resourceId: professionals.find(p => p.title === data.professional)?.id
                    };
                });
                setEvents(firestoreEvents);
            } catch (error) {
                console.error("Erro ao buscar os dados: ", error);
            }
        };

        fetchData();
    }, [professionals]);

    const generateTimeOptions = () => {
        const options = [];
        for (let i = 8; i <= 20; i++) {
            for (let j = 0; j < 60; j += 30) {
                if (i === 20 && j > 30) break;
                const hours = String(i).padStart(2, '0');
                const minutes = String(j).padStart(2, '0');
                options.push(`${hours}:${minutes}`);
            }
        }
        return options;
    };

    return (
        <div className="container">
            <Header
                openScheduleModal={openModal}
                openProfessionalModal={openProfessionalModal}
                openServiceModal={openServiceModal}
                openRegisterBoxModal={openRegisterBoxModal}
                openProductModal={openProductModal}
            />


            <Calendario
                events={events}
                setEvents={setEvents}
                professionals={professionals}
                paymentMethods={paymentMethods}
            />

            {modalIsOpen && (
                <div className="modal-overlay modal-overlay-open" onClick={closeModal}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Agendar Cliente</h2>
                        <form onSubmit={handleFormSubmit}>
                            <label>Nome do Cliente:</label>
                            <input type="text" name="clientName" onChange={handleFormInputChange} required />
                            <label>Serviço:</label>
                            <select name="title" onChange={handleFormInputChange} required>
                                <option value="">Selecione um serviço</option>
                                {services.map((service, index) => (
                                    <option key={index} value={service.name}>{service.name}</option>
                                ))}
                            </select>
                            <label>Profissional:</label>
                            <select name="professional" onChange={handleFormInputChange} required>
                                <option value="">Selecione um profissional</option>
                                {professionals.map((professional) => (
                                    <option key={professional.id} value={professional.title}>{professional.title}</option>
                                ))}
                            </select>
                            <label>Data:</label>
                            <input type="date" name="date" onChange={handleFormInputChange} required />

                            <label>Horário:</label>
                            <select name="time" value={formData.time} onChange={handleFormInputChange}>
                                <option value="">Selecione um horário</option>
                                {generateTimeOptions().map((time, index) => (
                                    <option key={index} value={time}>{time}</option>
                                ))}
                            </select>
                            <button type="button" className="agendarbotao" onClick={handleAddTime}>Adicionar Horário</button>

                            <ul className="selected-times">
                                {selectedTimes.map((time, index) => (
                                    <li key={index}>
                                        {time}
                                        <button type="button" onClick={() => handleRemoveTime(time)}>Remover</button>
                                    </li>
                                ))}
                            </ul>

                            <button type="submit">Agendar</button>
                            <button type="button" className="fecharbotao" onClick={closeModal}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}

            {modalProfessionalOpen && (
                <div className={`modal-overlay modal-overlay-open`} onClick={closeProfessionalModal}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Adicionar Profissional</h2>
                        <form onSubmit={handleAddProfessional}>
                            <label>Nome do Profissional:</label>
                            <input type="text" name="professionalName" required />
                            <button type="submit">Adicionar</button>
                            <button type="button" className="fecharbotao" onClick={closeProfessionalModal}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}

            {modalServiceOpen && (
                <div className={`modal-overlay modal-overlay-open`} onClick={closeServiceModal}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Adicionar Serviço</h2>
                        <form onSubmit={handleAddService}>
                            <label>Nome do Serviço:</label>
                            <input type="text" name="serviceName" required />
                            <label>Preço do Serviço:</label>
                            <input type="number" step="0.01" name="servicePrice" required />
                            <button type="submit">Adicionar</button>
                            <button type="button" className="fecharbotao" onClick={closeServiceModal}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}

            {modalProductOpen && (
                <div className="modal-overlay modal-overlay-open" onClick={closeProductModal}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Adicionar Produto</h2>
                        <form onSubmit={handleAddProduct}>
                            <label>Nome do Produto:</label>
                            <input
                                type="text"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                required
                            />
                            <label>Preço de Custo:</label>
                            <input
                                type="number"
                                step="0.01"
                                value={productCost}
                                onChange={(e) => setProductCost(e.target.value)}
                                required
                            />
                            <label>Valor de Venda:</label>
                            <input
                                type="number"
                                step="0.01"
                                value={productSalePrice}
                                onChange={(e) => setProductSalePrice(e.target.value)}
                                required
                            />
                            <label>Quantidade:</label>
                            <input
                                type="number"
                                value={productQuantity}
                                onChange={(e) => setProductQuantity(e.target.value)}
                                required
                            />
                            <button type="submit">Adicionar</button>
                            <button id="detalhebotao" type="button" onClick={handleOpenStockDetails}>Ver Produtos</button>
                            <button type="button" className="fecharbotao" onClick={closeProductModal}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}

            {isModalStockDetailsOpen && (
                <div className="modal-overlay-vendas" onClick={closeStockDetailsModal}>
                    <div className="modal-vendas" onClick={(e) => e.stopPropagation()}>
                        <h2>Estoque de Produtos</h2>
                        {stockData && stockData.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome do Produto</th>
                                        <th>Preço de Venda</th>
                                        <th>Preço de Custo</th>
                                        <th>Estoque Disponível</th>
                                        <th>Ações</th> {/* Nova coluna para Ações */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockData.map((product) => (
                                        <tr key={product.id}>
                                            <td>{product.name}</td>
                                            <td>{Number.isFinite(product.salePrice) ? `R$ ${product.salePrice.toFixed(2)}` : 'N/A'}</td>
                                            <td>{Number.isFinite(product.costPrice) ? `R$ ${product.costPrice.toFixed(2)}` : 'N/A'}</td>
                                            <td>{Number.isFinite(product.stock) ? product.stock : '-'}</td>
                                            <td>
                                                <FaEdit onClick={() => handleEditProduct(product)} style={{ cursor: 'pointer', marginRight: '10px' }} />
                                                <FaTrash onClick={() => handleDeleteProduct(product.id)} style={{ cursor: 'pointer', color: 'red' }} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>Nenhum dado de estoque disponível.</p>
                        )}
                        <button onClick={closeStockDetailsModal}>Fechar</button>
                    </div>
                </div>
            )}

            {isEditProductModalOpen && (
                <div className="modal-overlay modal-overlay-open" onClick={() => setEditProductModalOpen(false)}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Editar Produto</h2>
                        <form onSubmit={handleUpdateProduct}>
                            <label>Nome do Produto:</label>
                            <input
                                type="text"
                                value={editProductData.name}
                                onChange={(e) => setEditProductData({ ...editProductData, name: e.target.value })}
                                required
                            />
                            <label>Preço de Custo:</label>
                            <input
                                type="number"
                                step="0.01"
                                value={editProductData.costPrice}
                                onChange={(e) => setEditProductData({ ...editProductData, costPrice: e.target.value })}
                                required
                            />
                            <label>Preço de Venda:</label>
                            <input
                                type="number"
                                step="0.01"
                                value={editProductData.salePrice}
                                onChange={(e) => setEditProductData({ ...editProductData, salePrice: e.target.value })}
                                required
                            />
                            <label>Estoque:</label>
                            <input
                                type="number"
                                value={editProductData.stock}
                                onChange={(e) => setEditProductData({ ...editProductData, stock: e.target.value })}
                                required
                            />
                            <button type="submit">Salvar</button>
                            <button type="button" className="fecharbotao" onClick={() => setEditProductModalOpen(false)}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}

            {modalRegisterBoxOpen && (
                <div className="modal-overlay-caixa modal-overlay-caixa-open" onClick={closeRegisterBoxModal}>
                    <div className="modal-caixa modal-caixa-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Caixa</h2>
                        <h3>Valor atual no Caixa: R$ {boxValue.toFixed(2)}</h3>

                        <div className="box-adjust">
                            <label>Valor para ajuste | para valores negativos inclua "-":</label>
                            <input
                                type="number"
                                step="0.01"
                                value={adjustmentValue}
                                onChange={handleBoxInputChange}
                                placeholder="Digite o valor"
                            />
                            <button onClick={handleAdjustMoney}>Ajustar Caixa</button>
                        </div>

                        <h3>Saldos dos Profissionais:</h3>
                        <ul>
                            {professionalBalances.map((professional) => {
                                const teste = professional.name === 'teste';
                                return (
                                    <li key={professional.id}>
                                        {professional.name}: R$ {professional.balance.toFixed(2)}
                                        {!teste && (
                                            <span>
                                                {' '} | Sem comissão: R$ {professional.originalSaleValue?.toFixed(2) || 'N/A'}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>

                        <button id="detalhebotao" onClick={handleOpenSalesDetails}>Ver Vendas Detalhadas</button>
                        <br></br>
                        <button onClick={closeRegisterBoxModal}>Fechar</button>
                    </div>
                </div>
            )}

            {modalSalesDetailsOpen && (
                <div className="modal-overlay-vendas" onClick={closeSalesDetailsModal}>
                    <div className="modal-vendas" onClick={(e) => e.stopPropagation()}>
                        <h2>Vendas Detalhadas</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Cliente</th>
                                    <th>Serviços</th>
                                    <th>Produtos</th>
                                    <th>Valor Total</th>
                                    <th>Valor com Comissão</th>
                                    <th>Método de Pagamento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesData
                                    .sort((a, b) => new Date(b.start) - new Date(a.start))
                                    .map((sale) => (
                                        <tr key={sale.id}>
                                            <td>{sale.event.title || "Cliente Desconhecido"}</td>
                                            <td>
                                                {sale.services.map(service => (
                                                    <div key={service.id}>
                                                        {service.name} - Quantidade: {service.quantity} - Valor: R$ {service.price.toFixed(2)}
                                                        <br />
                                                        Profissional: {service.professionalName} - Valor Recebido: R$ {service.valorLiquido.toFixed(2)}
                                                    </div>
                                                ))}
                                            </td>
                                            <td>
                                                {sale.products.map(product => (
                                                    <div key={product.id}>
                                                        {product.name} - Quantidade: {product.quantity} - Valor: R$ {product.salePrice.toFixed(2)}
                                                        <br />
                                                        Profissional: {product.professionalName} - Valor Recebido: R$ {product.valorLiquido.toFixed(2)}
                                                    </div>
                                                ))}
                                            </td>
                                            <td>R$ {sale.totalPrice.toFixed(2)}</td>
                                            <td>R$ {sale.netTotal.toFixed(2)}</td>
                                            <td>{sale.paymentMethod}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                        <button onClick={closeSalesDetailsModal}>Fechar</button>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Dashboard;
