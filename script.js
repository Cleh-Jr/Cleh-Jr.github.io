// --- CONFIGURAÇÃO ---
// 1. Pegue sua chave em: https://www.steamgriddb.com/profile/preferences/api
const SGDB_API_KEY = c1c6a611af8537dfde7babca64617fa4; 

// Proxy para permitir a conexão do navegador com a API
const CORS_PROXY = "https://corsproxy.io/?";

document.addEventListener('DOMContentLoaded', () => {
    renderLibrary();
    
    // Filtro de busca
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderLibrary(e.target.value);
    });
});

// Cache para evitar requisições repetidas
const imageCache = {};

function renderLibrary(filter = "") {
    const container = document.getElementById('libraryContainer');
    container.innerHTML = '';

    // Ordem das bibliotecas conforme solicitado
    const storeOrder = [
        "Steam", 
	"Steam Family Sharing", 
	"Epic Games", 
	"Epic", 
	"EA App", 
        "Origin", 
	"Ubisoft Connect", 
	"GOG", 
	"Battle.net", 
	"Amazon Games", 
	"Amazon", 
	"RobotCache"
    ];

    const grouped = gamesData.reduce((acc, game) => {
        const store = (game.Fontes || "Outros").trim();
        if (!acc[store]) acc[store] = [];
        acc[store].push(game);
        return acc;
    }, {});

    const sortedStores = Object.keys(grouped).sort((a, b) => {
        let indexA = storeOrder.findIndex(s => a.toLowerCase().includes(s.toLowerCase()));
        let indexB = storeOrder.findIndex(s => b.toLowerCase().includes(s.toLowerCase()));
        if (indexA === -1) indexA = 999;
        if (indexB === -1) indexB = 999;
        return indexA - indexB;
    });

    sortedStores.forEach(store => {
        const gamesInStore = grouped[store].filter(g => g.Nome.toLowerCase().includes(filter.toLowerCase()));
        if (gamesInStore.length === 0) return;

        const section = document.createElement('div');
        section.className = 'mb-12';
        section.innerHTML = `
            <button class="w-full flex justify-between p-4 bg-gray-900/50 rounded-xl mb-6 border border-gray-800 font-bold uppercase tracking-widest hover:bg-gray-800 transition" 
                    onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span><i class="fas fa-database mr-3 text-blue-500"></i> ${store} <span class="text-blue-500 ml-2">${gamesInStore.length}</span></span>
                <i class="fas fa-chevron-down text-xs"></i>
            </button>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                ${gamesInStore.map(game => `
                    <div class="game-card cursor-pointer hover:scale-105 transition transform rounded-xl overflow-hidden shadow-2xl aspect-[2/3] relative group bg-[#1e293b] border border-gray-800" 
                         onclick="openDetails('${game.Id}')"
                         data-name="${game.Nome}"
                         data-id="${game.Id}">
                        
                        <div class="absolute inset-0 flex items-center justify-center p-4 text-center z-0">
                            <div class="flex flex-col items-center opacity-40">
                                <i class="fas fa-circle-notch fa-spin mb-2 text-blue-500"></i>
                                <span class="text-white font-bold uppercase text-[8px] tracking-tighter">${game.Nome}</span>
                            </div>
                        </div>

                        <img class="game-cover w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-500" 
                             alt="${game.Nome}">
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(section);
    });

    startImageObserver();
}

// --- LÓGICA DE BUSCA DE IMAGENS (API STEAMGRIDDB) ---

function startImageObserver() {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                fetchGridImage(card.getAttribute('data-name'), card);
                obs.unobserve(card);
            }
        });
    }, { rootMargin: "100px" });

    document.querySelectorAll('.game-card').forEach(card => observer.observe(card));
}

async function fetchGridImage(gameName, cardElement) {
    const img = cardElement.querySelector('.game-cover');
    if (imageCache[gameName]?.cover) return applyImg(img, imageCache[gameName].cover);

    try {
        const cleanName = gameName.replace(/[^a-zA-Z0-9 ]/g, ' ');
        const searchRes = await fetch(`${CORS_PROXY}https://www.steamgriddb.com/api/v2/search/by/name/${encodeURIComponent(cleanName)}`, {
            headers: { 'Authorization': `Bearer ${SGDB_API_KEY}` }
        });
        const searchData = await searchRes.json();

        if (searchData.success && searchData.data[0]) {
            const sgdbId = searchData.data[0].id;
            const gridRes = await fetch(`${CORS_PROXY}https://www.steamgriddb.com/api/v2/grids/game/${sgdbId}?dimensions=600x900`, {
                headers: { 'Authorization': `Bearer ${SGDB_API_KEY}` }
            });
            const gridData = await gridRes.json();
            
            if (gridData.success && gridData.data[0]) {
                const url = gridData.data[0].url;
                if (!imageCache[gameName]) imageCache[gameName] = {};
                imageCache[gameName].cover = url;
                imageCache[gameName].sgdbId = sgdbId;
                applyImg(img, url);
            }
        }
    } catch (e) { console.error("Erro ao buscar imagem:", gameName); }
}

function applyImg(el, url) {
    el.src = url;
    el.onload = () => el.classList.remove('opacity-0');
}

// --- MODAL E LINKS EXTERNOS ---

async function openDetails(gameId) {
    const game = gamesData.find(g => g.Id === gameId);
    if (!game) return;

    const modal = document.getElementById('gameModal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `<div class="h-96 flex items-center justify-center text-blue-500 font-bold animate-pulse uppercase tracking-widest">Carregando Detalhes...</div>`;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    let banner = "";
    const cached = imageCache[game.Nome];

    if (cached?.sgdbId) {
        try {
            const heroRes = await fetch(`${CORS_PROXY}https://www.steamgriddb.com/api/v2/heroes/game/${cached.sgdbId}`, {
                headers: { 'Authorization': `Bearer ${SGDB_API_KEY}` }
            });
            const heroData = await heroRes.json();
            banner = heroData.data[0]?.url || "";
        } catch (e) { console.error("Erro banner"); }
    }

    const pcWiki = `https://www.pcgamingwiki.com/wiki/${game.Nome.replace(/ /g, '_')}#System_requirements`;
    const nomeEnc = encodeURIComponent(game.Nome);

    content.innerHTML = `
        <div class="relative h-96 bg-[#0b0e14]">
            <img src="${banner}" class="w-full h-full object-cover opacity-40">
            <div class="absolute inset-0 bg-gradient-to-t from-[#151921] via-transparent"></div>
            <div class="absolute bottom-0 p-10">
                <h2 class="text-5xl font-black uppercase italic tracking-tighter text-white">${game.Nome}</h2>
                <p class="text-blue-500 font-bold mt-2 uppercase text-xs tracking-[0.3em]">${game.Fontes}</p>
            </div>
        </div>
        <div class="p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div class="space-y-4 text-sm bg-white/5 p-6 rounded-3xl border border-white/10 h-fit">
                <p><span class="text-gray-500 uppercase text-[10px] font-bold">Desenvolvedor</span><br><strong>${game.Desenvolvedores || 'N/A'}</strong></p>
                <p><span class="text-gray-500 uppercase text-[10px] font-bold">Gêneros</span><br><strong>${game.Gêneros || 'N/A'}</strong></p>
                <div class="flex justify-between border-t border-white/10 pt-4 mt-4">
                    <div><p class="text-[10px] text-gray-500 font-bold">CRÍTICA</p><p class="text-2xl font-black text-green-400">${game['Avaliação da crítica'] || '--'}</p></div>
                    <div><p class="text-[10px] text-gray-500 font-bold">USER</p><p class="text-2xl font-black text-blue-400">${game['Avaliação da comunidade'] || '--'}</p></div>
                </div>
            </div>
            <div class="md:col-span-2 space-y-8">
                <div>
                    <h3 class="text-blue-500 font-black text-xs uppercase tracking-widest mb-4">Descrição</h3>
                    <p class="text-gray-300 leading-relaxed">${game.Descrição || 'Sem descrição.'}</p>
                </div>
                <div class="flex flex-wrap gap-4">
                    <a href="${pcWiki}" target="_blank" class="btn-icon bg-blue-900/30" title="Requisitos"><i class="fas fa-microchip"></i></a>
                    <a href="https://www.co-optimus.com/search.php?q=${nomeEnc}" target="_blank" class="btn-icon bg-[#005596]" title="Co-optimus"><i class="fas fa-users"></i></a>
                    <a href="https://www.youtube.com/results?search_query=${nomeEnc}+trailer" target="_blank" class="btn-icon bg-[#FF0000]" title="YouTube"><i class="fab fa-youtube"></i></a>
                    <a href="https://howlongtobeat.com/?q=${nomeEnc}" target="_blank" class="btn-icon bg-[#E64A19]" title="HLTB"><i class="fas fa-clock"></i></a>
                    <a href="https://gg.deals/games/?title=${nomeEnc}" target="_blank" class="btn-icon bg-[#004a00]" title="GG Deals"><i class="fas fa-tag"></i></a>
                </div>
            </div>
        </div>
    `;
}

function closeModal() {
    document.getElementById('gameModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}