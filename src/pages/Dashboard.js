import React, { useState, useEffect } from 'react';
import Calendario from '../components/Calendario';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../Styles/Dashboard.css';
import moment from 'moment-timezone';
import Header from '../components/Header';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { subDays, subMonths, isWithinInterval } from 'date-fns';

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
    const [boxValue, setBoxValue] = useState(0);
    const [adjustmentValue, setAdjustmentValue] = useState('');
    const [modalProductOpen, setModalProductOpen] = useState(false);
    const [productName, setProductName] = useState('');
    const [productCost, setProductCost] = useState('');
    const [productSalePrice, setProductSalePrice] = useState('');
    const [modalSalesDetailsOpen, setModalSalesDetailsOpen] = useState(false);
    const [salesData, setSalesData] = useState([]);
    const [productQuantity, setProductQuantity] = useState('');
    const [stockData, setStockData] = useState([]);
    const [serviceData, setServiceData] = useState([]);
    const [isModalStockDetailsOpen, setModalStockDetailsOpen] = useState(false);
    const [isModalServiceDetailsOpen, setModalServiceDetailsOpen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [modalProfessionalBalancesOpen, setModalProfessionalBalancesOpen] = useState(false);
    const [weeklyBalances, setWeeklyBalances] = useState([]);
    const [modalMonthlyBalancesOpen, setModalMonthlyBalancesOpen] = useState(false);
    const [monthlyBalances, setMonthlyBalances] = useState([]);
    const [openBoxes, setOpenBoxes] = useState([]);
    const [modalOpenBoxesOpen, setModalOpenBoxesOpen] = useState(false);
    const [filter, setFilter] = useState('all');
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filteredSalesData, setFilteredSalesData] = useState([]);
    const [formData, setFormData] = useState({
        clientName: '',
        title: '',
        professional: '',
        date: '',
        time: ''
    });

    const [isEditServiceModalOpen, setEditServiceModalOpen] = useState(false);
    const [editServiceData, setEditServiceData] = useState({
        name: '',
        price: '',
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


    const closeProfessionalBalancesModal = () => setModalProfessionalBalancesOpen(false);
    const closeMonthlyBalancesModal = () => setModalMonthlyBalancesOpen(false);
    const closeOpenBoxesModal = () => setModalOpenBoxesOpen(false);


    const fetchBalances = async (start, end) => {
        try {
            setLoading(true);
            const boxesQuery = query(
                collection(db, "boxes"),
                where("date", ">=", start),
                where("date", "<=", end)
            );
            const querySnapshot = await getDocs(boxesQuery);

            const balanceMap = {};

            querySnapshot.forEach((doc) => {
                const professionals = doc.data().professionals || [];

                professionals.forEach((prof) => {
                    if (!balanceMap[prof.id]) {
                        balanceMap[prof.id] = {
                            name: prof.name,
                            balance: parseFloat(prof.balance) || 0
                        };
                    } else {
                        balanceMap[prof.id].balance += parseFloat(prof.balance) || 0;
                    }
                });
            });

            const fetchedBalances = Object.values(balanceMap);
            setBalances(fetchedBalances);
        } catch (error) {
            console.error("Erro ao buscar os saldos dos profissionais: ", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
        const endOfMonth = moment().endOf('month').format('YYYY-MM-DD');

        fetchBalances(startOfMonth, endOfMonth);
    }, []);


    const openOpenBoxesModal = async () => {
        try {
            const boxesSnapshot = await getDocs(collection(db, "boxes"));
            const boxesData = [];

            boxesSnapshot.forEach((doc) => {
                const data = doc.data();
                const professionals = data.professionals || [];

                let totalAmount = 0;

                professionals.forEach((prof) => {
                    totalAmount += parseFloat(prof.balance) || 0;
                });

                professionals.forEach((prof) => {
                    boxesData.push({
                        date: data.date,
                        name: prof.name,
                        balance: parseFloat(prof.balance) || 0,
                        totalAmount: totalAmount,  
                        timestamp: new Date(data.date),  
                    });
                });
            });

            setOpenBoxes(boxesData);
            setModalOpenBoxesOpen(true);
        } catch (error) {
            console.error("Erro ao buscar os caixas abertos: ", error);
        }
    };

    const applyFilter = () => {
        const now = new Date();

        switch (filter) {
            case 'week':
                return openBoxes.filter(box =>
                    isWithinInterval(box.timestamp, { start: subDays(now, 7), end: now })
                );
            case 'month':
                return openBoxes.filter(box =>
                    isWithinInterval(box.timestamp, { start: subMonths(now, 1), end: now })
                );
            case 'all':
            default:
                return openBoxes;
        }
    };

    const filteredBoxes = applyFilter();

    const handleFilterChange = (filterType) => {
        let start, end;

        if (filterType === 'week') {
            start = moment().startOf('week').format('YYYY-MM-DD');
            end = moment().endOf('week').format('YYYY-MM-DD');
        } else if (filterType === 'month') {
            start = moment().startOf('month').format('YYYY-MM-DD');
            end = moment().endOf('month').format('YYYY-MM-DD');
        } else {
            start = '2020-01-01'; 
            end = moment().format('YYYY-MM-DD');
        }

        fetchBalances(start, end);
    };

    const openProfessionalBalancesModal = async () => {
        const startOfWeek = moment().startOf('week').format('YYYY-MM-DD');
        const endOfWeek = moment().endOf('week').format('YYYY-MM-DD');

        try {
            const boxesQuery = query(
                collection(db, "boxes"),
                where("date", ">=", startOfWeek),
                where("date", "<=", endOfWeek)
            );
            const querySnapshot = await getDocs(boxesQuery);

            const balanceMap = {};

            querySnapshot.forEach((doc) => {
                const professionals = doc.data().professionals || [];

                professionals.forEach((prof) => {
                    if (!balanceMap[prof.id]) {
                        balanceMap[prof.id] = {
                            name: prof.name,
                            balance: parseFloat(prof.balance) || 0
                        };
                    } else {
                        balanceMap[prof.id].balance += parseFloat(prof.balance) || 0;
                    }
                });
            });

            const balances = Object.values(balanceMap);

            setWeeklyBalances(balances);
            setModalProfessionalBalancesOpen(true);
        } catch (error) {
            console.error("Erro ao buscar os saldos dos profissionais da semana: ", error);
        }
    };


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

    const handleEditService = (service) => {
        closeServiceDetailsModal(); 
        setEditServiceData({
            id: service.id,  
            name: service.name,
            price: service.price,
        });
        setEditServiceModalOpen(true); 
    };

    const openRegisterBoxModal = async () => {
        setModalRegisterBoxOpen(true);
        await handleOpenBox();
    };


    const handleOpenServiceDetails = async () => {
        try {
            const q = query(collection(db, "services"));
            const querySnapshot = await getDocs(q);
            const services = querySnapshot.docs.map(doc => ({
                id: doc.id, 
                ...doc.data() 
            }));

            console.log(services);
            setServiceData(services);  
            setModalServiceDetailsOpen(true); 
        } catch (error) {
            console.error("Erro ao carregar os serviços: ", error);
        }
    };

    const handleOpenStockDetails = async () => {
        try {
            const q = query(collection(db, "products"));
            const querySnapshot = await getDocs(q);

            const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log(products);
            setStockData(products);
            setModalStockDetailsOpen(true); 
        } catch (error) {
            console.error("Erro ao carregar o estoque: ", error);
        }
    };

    const closeStockDetailsModal = () => {
        setModalStockDetailsOpen(false);
    };

    const closeServiceDetailsModal = () => {
        setModalServiceDetailsOpen(false);
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

            setStockData(stockData.map(product =>
                product.id === id ? { ...product, name, costPrice: parseFloat(costPrice), salePrice: parseFloat(salePrice), stock: parseInt(stock, 10) } : product
            ));

            setEditProductModalOpen(false);
            setEditProductData({ id: '', name: '', costPrice: '', salePrice: '', stock: '' });

            handleOpenStockDetails(); 

            console.log("Produto atualizado com sucesso.");
        } catch (error) {
            console.error("Erro ao atualizar produto: ", error);
        }
    };

    const handleUpdateService = async (e) => {
        e.preventDefault();

        const { id, name, price } = editServiceData;

        try {
            await updateDoc(doc(db, "services", id), {
                name,
                price: parseFloat(price),
            });

            setServiceData(serviceData.map(service =>
                service.id === id ? { ...service, name, price: parseFloat(price) } : service
            ));

            setEditServiceModalOpen(false);

            setEditServiceData({ id: '', name: '', price: '' });

            handleOpenServiceDetails();

            console.log("Serviço atualizado com sucesso.");
        } catch (error) {
            console.error("Erro ao atualizar serviço: ", error);
        }
    };
    const handleDeleteProduct = async (productId) => {
        const confirmDelete = window.confirm("Você tem certeza que deseja excluir este produto?");
        if (confirmDelete) {
            try {
                await deleteDoc(doc(db, "products", productId)); 
                setStockData(stockData.filter(product => product.id !== productId));
                console.log("Produto excluído com sucesso");
            } catch (error) {
                console.error("Erro ao excluir produto: ", error);
            }
        }
    };

    const handleDeleteService = async (serviceDocId) => {
        const confirmDelete = window.confirm("Você tem certeza que deseja excluir este serviço?");
        if (confirmDelete) {
            try {
                const serviceRef = doc(db, "services", serviceDocId); 
                await deleteDoc(serviceRef);
                setServiceData(prevData => prevData.filter(service => service.id !== serviceDocId));

                console.log("Serviço deletado com sucesso.");

            } catch (error) {
                console.error("Erro ao deletar serviço: ", error);
            }
        }
    };

    const handleOpenSalesDetails = async () => {
        try {
            const q = query(collection(db, "vendas"));
            const querySnapshot = await getDocs(q);

            const sales = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const now = new Date();
            const lastUpdateDate = new Date(lastUpdated);
            const weeksDifference = Math.floor((now - lastUpdateDate) / (1000 * 60 * 60 * 24 * 7));

            if (weeksDifference >= 1) {
                setSalesData([]); 
                setLastUpdated(now);
            } else {
                setSalesData(sales.sort((a, b) => new Date(b.event.start) - new Date(a.event.start)));
                setFilteredSalesData(sales.sort((a, b) => new Date(b.event.start) - new Date(a.event.start))); 
            }

            setModalSalesDetailsOpen(true);
        } catch (error) {
            console.error("Erro ao carregar vendas: ", error);
        }
    };

    useEffect(() => {
        setLastUpdated(new Date()); 
    }, []);

    const closeSalesDetailsModal = () => {
        setModalSalesDetailsOpen(false);
    };

    const filterSalesByPeriod = (period) => {
        const now = new Date();
        let filteredSales;

        switch (period) {
            case 'day':
                filteredSales = salesData.filter(sale => {
                    let saleDate = sale.event.start instanceof Timestamp ? sale.event.start.toDate() : new Date(sale.event.start);
                    return saleDate.toDateString() === now.toDateString();
                });
                break;
            case 'week':
                filteredSales = salesData.filter(sale => {
                    let saleDate = sale.event.start instanceof Timestamp ? sale.event.start.toDate() : new Date(sale.event.start);
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(now.getDate() - 7);
                    return saleDate >= oneWeekAgo && saleDate <= now;
                });
                break;
            case 'month':
                filteredSales = salesData.filter(sale => {
                    let saleDate = sale.event.start instanceof Timestamp ? sale.event.start.toDate() : new Date(sale.event.start);
                    return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
                });
                break;
            default:
                filteredSales = salesData;
        }

        setFilteredSalesData(filteredSales);
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

    const handleOpenBox = async () => {
        try {
            const today = moment().format('YYYY-MM-DD');
            let initialBoxValue = 0;

            const querySnapshot = await getDocs(collection(db, "boxes"));
            const existingBox = querySnapshot.docs.find(doc => doc.data().date === today);

            if (existingBox) {
                const boxData = existingBox.data();
                const professionalBalancesFromBox = boxData.professionals;
                setProfessionalBalances(professionalBalancesFromBox);
                setBoxValue(boxData.boxValue || initialBoxValue);  
                console.log("Caixa já registrado hoje. Exibindo os dados.");
            } else {
                const professionalSnapshot = await getDocs(collection(db, "professionals"));
                const professionalData = professionalSnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    balance: parseFloat(doc.data().balance) || 0
                }));

                setProfessionalBalances(professionalData);

                await addDoc(collection(db, "boxes"), {
                    date: today,
                    professionals: professionalData,
                    boxValue: initialBoxValue  
                });

                console.log("Caixa registrado com sucesso.");
            }
        } catch (error) {
            console.error("Erro ao abrir o caixa: ", error);
        }
    };

    const handleAdjustMoney = async () => {
        const valueToAdjust = parseFloat(adjustmentValue);
        if (isNaN(valueToAdjust)) {
            alert("Por favor, insira um valor válido.");
            return;
        }

        const newBoxValue = boxValue + valueToAdjust; 
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

        setAdjustmentValue('');  
    };

    const handleBoxInputChange = (e) => {
        setAdjustmentValue(e.target.value);
    };

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
                    const confirmation = window.confirm("Já existe um agendamento nesse horário. Deseja substituir?");
                    if (confirmation) {
                        await deleteDoc(doc(db, "schedules", conflictingEventDoc.id)); 

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
                    await addDoc(collection(db, "schedules"), {
                        clientName: formData.clientName,
                        service: formData.title,
                        professional: formData.professional,
                        date: moment(event.start).format("YYYY-MM-DD"),
                        time: moment(event.start).format("HH:mm")
                    });
                }
            }
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
                            <button id="detalhebotao" type="button" onClick={handleOpenServiceDetails}>Ver Serviços</button>
                            <button type="button" className="fecharbotao" onClick={closeServiceModal}>Fechar</button>
                        </form>
                    </div>
                </div>
            )}

            {isModalServiceDetailsOpen && (
                <div className="modal-overlay-vendas" onClick={closeServiceDetailsModal}>
                    <div className="modal-vendas" onClick={(e) => e.stopPropagation()}>
                        <h2>Serviços</h2>
                        {serviceData && serviceData.length > 0 ? (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome do Serviço</th>
                                        <th>Preço</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {serviceData.map((services) => (
                                        <tr key={services.id}>
                                            <td>{services.name}</td>
                                            <td>{Number.isFinite(services.price) ? `R$ ${services.price.toFixed(2)}` : 'N/A'}</td>
                                            <td>
                                                <FaEdit onClick={() => handleEditService(services)} style={{ cursor: 'pointer', marginRight: '10px' }} />
                                                <FaTrash onClick={() => handleDeleteService(services.id)} style={{ cursor: 'pointer', color: 'red' }} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p>Nenhum dado de serviços disponível.</p>
                        )}
                        <button onClick={closeServiceDetailsModal}>Fechar</button>
                    </div>
                </div>
            )}

            {isEditServiceModalOpen && (
                <div className="modal-overlay modal-overlay-open" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setEditServiceModalOpen(false);
                    }
                }}>
                    <div className="modal modal-open" onClick={(e) => e.stopPropagation()}>
                        <h2>Editar Serviço</h2>
                        <form onSubmit={handleUpdateService}>
                            <label>Nome do Serviço:</label>
                            <input
                                type="text"
                                value={editServiceData.name}
                                onChange={(e) => setEditServiceData({ ...editServiceData, name: e.target.value })}
                                required
                            />
                            <label>Preço:</label>
                            <input
                                type="number"
                                step="0.01"
                                value={editServiceData.price}
                                onChange={(e) => setEditServiceData({ ...editServiceData, price: e.target.value })}
                                required
                            />
                            <button type="submit">Salvar</button>
                            <button
                                type="button"
                                className="fecharbotao"
                                onClick={() => {
                                    console.log("Fechar clicado!");
                                    setEditServiceModalOpen(false); 
                                }}
                            >
                                Fechar
                            </button>
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
                                        <th>Ações</th>
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

                        <h3>Saldos do Dia:</h3>
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

                        <button id='versaldos' onClick={openProfessionalBalancesModal}>Saldos</button>
                        <button id="detalhebotao" onClick={handleOpenSalesDetails}>Vendas Detalhadas</button>
                        <button id="detalhebotao" onClick={openOpenBoxesModal}>Caixas Abertos</button>
                        <br></br>
                        <button onClick={closeRegisterBoxModal}>Fechar</button>
                    </div>
                </div>
            )}

            {modalOpenBoxesOpen && (
                <div className="modal-overlay-vendas" onClick={closeOpenBoxesModal}>
                    <div className="modal-vendas" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <h2 style={{ margin: '0', paddingRight: '20px' }}>Caixas Abertos</h2>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button onClick={() => setFilter('week')} style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>Caixas da Semana</button>
                                <button onClick={() => setFilter('month')} style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>Caixas do Mês</button>
                                <button onClick={() => setFilter('all')} style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>Todos os Caixas</button>
                            </div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Nome do Profissional</th>
                                    <th>Saldo</th>
                                    <th>Total do Caixa no Dia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBoxes.map((box, index) => (
                                    <tr key={index}>
                                        <td>{box.date}</td>
                                        <td>{box.name}</td>
                                        <td>R$ {box.balance.toFixed(2)}</td>
                                        <td>R$ {box.totalAmount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={closeOpenBoxesModal}>Fechar</button>
                    </div>
                </div>
            )}

            {modalMonthlyBalancesOpen && (
                <div className="modal-overlay-vendas" onClick={closeMonthlyBalancesModal}>
                    <div className="modal-vendas" onClick={(e) => e.stopPropagation()}>
                        <h2>Saldos Mensal</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyBalances.map(prof => (
                                    <tr key={prof.id}>
                                        <td>{prof.name}</td>
                                        <td>R$ {prof.balance.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={closeMonthlyBalancesModal}>Fechar</button>
                    </div>
                </div>
            )}
            {modalProfessionalBalancesOpen && (
                <div className="modal-overlay-vendas" onClick={closeProfessionalBalancesModal}>
                    <div className="modal-vendas" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <h2 style={{ margin: '0', paddingBottom: '20px' }}>Saldos</h2>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button onClick={() => handleFilterChange('week')} style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>Saldos da Semana</button>
                                <button onClick={() => handleFilterChange('month')} style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>Saldos do Mês</button>
                            </div>
                        </div>
                        {loading ? (
                            <p>Carregando saldos...</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Saldo com Comissão</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {balances.length > 0 ? (
                                        balances.map((prof) => (
                                            <tr key={prof.id}>
                                                <td>{prof.name}</td>
                                                <td>R$ {prof.balance.toFixed(2)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="2">Nenhum saldo encontrado.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                        <button onClick={closeProfessionalBalancesModal}> Fechar </button>
                    </div>
                </div>
            )}
            {modalSalesDetailsOpen && (
                <div className="modal-overlay-vendas" onClick={closeSalesDetailsModal}>
                    <div className="modal-vendas" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <h2 style={{ margin: '0', paddingRight: '20px' }}>Vendas</h2>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button onClick={() => filterSalesByPeriod('day')} style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>Vendas do Dia</button>
                                <button onClick={() => filterSalesByPeriod('week')} style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>Vendas da Semana</button>
                                <button onClick={() => filterSalesByPeriod('month')} style={{ backgroundColor: '#1E3A8A', color: '#FFFFFF' }}>Vendas do Mês</button>
                            </div>
                        </div>
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
                                {filteredSalesData.length > 0 ? filteredSalesData.map((sale) => (
                                    <tr key={sale.id}>
                                        <td>{sale.event.title || "Cliente Desconhecido"}</td>
                                        <td>
                                            {sale.services?.map(service => (
                                                <div key={service.id}>
                                                    {service.name} - Quantidade: {service.quantity} - Valor: R$ {service.price.toFixed(2)}
                                                    <br />
                                                    Profissional: {service.professionalName} - Valor Recebido: R$ {service.valorLiquido.toFixed(2)}
                                                </div>
                                            ))}
                                        </td>
                                        <td>
                                            {sale.products?.map(product => (
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
                                )) : (
                                    <tr>
                                        <td colSpan="6">Nenhuma venda encontrada para o período selecionado.</td>
                                    </tr>
                                )}
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
