document.addEventListener('DOMContentLoaded', () => {
    renderLibrary();
    document.getElementById('searchInput').addEventListener('input', (e) => renderLibrary(e.target.value));
});

// Cache para não pesquisar o mesmo jogo várias vezes
const apiCache = new Map();

async function fetchSteamDataByName(gameName, imgElement, type = 'cover') {
    const cleanName = gameName.replace(/[^a-zA-Z0-9 ]/g, '');
    
    // Se já pesquisamos este jogo, usa o que está na memória
    if (apiCache.has(cleanName)) {
        applyImage(imgElement, apiCache.get(cleanName), type);
        return;
    }

    try {
        // Usamos o buscador oficial da loja Steam via Proxy para evitar bloqueio
        const searchUrl = `https://corsproxy.io/?${encodeURIComponent('https://store.steampowered.com/api/storesearch/?term=' + cleanName + '&l=brazilian&cc=BR')}`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();

        if (data.total > 0 && data.items[0]) {
            const appId = data.items[0].id;
            apiCache.set(cleanName, appId);
            applyImage(imgElement, appId, type);
        }
    } catch (error) {
        console.error("Erro ao buscar:", gameName);
    }
}

function applyImage(imgElement, appId, type) {
    const url = type === 'cover' 
        ? `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`
        : `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_hero.jpg`;
    
    imgElement.src = url;
    imgElement.style.opacity = '1';
}

function renderLibrary(filter = "") {
    const container = document.getElementById('libraryContainer');
    container.innerHTML = '';

    const storeOrder = ["Steam", "Steam Family Sharing", "Epic", "EA App", "Origin", "Ubisoft", "GOG", "Battle.net", "Amazon", "RobotCache"];

    const grouped = gamesData.reduce((acc, game) => {
        const store = (game.Fontes || "Outros").trim();
        if (!acc[store]) acc[store] = [];
        acc[store].push(game);
        return acc;
    }, {});

    const sortedStores = Object.keys(grouped).sort((a, b) => {
        let idxA = storeOrder.findIndex(s => a.toLowerCase().includes(s.toLowerCase()));
        let idxB = storeOrder.findIndex(s => b.toLowerCase().includes(s.toLowerCase()));
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    sortedStores.forEach(store => {
        const gamesInStore = grouped[store].filter(g => g.Nome.toLowerCase().includes(filter.toLowerCase()));
        if (gamesInStore.length === 0) return;

        const section = document.createElement('div');
        section.className = 'mb-12';
        section.innerHTML = `
            <button class="w-full flex justify-between p-4 bg-gray-900/50 rounded-xl mb-6 border border-gray-800 font-bold uppercase tracking-widest hover:bg-gray-800 transition" onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span><i class="fas fa-layer-group mr-3 text-blue-500"></i> ${store} <span class="text-blue-500 ml-2">${gamesInStore.length}</span></span>
                <i class="fas fa-chevron-down text-xs"></i>
            </button>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                ${gamesInStore.map(game => `
                    <div class="game-card cursor-pointer hover:scale-105 transition transform rounded-xl overflow-hidden shadow-2xl aspect-[2/3] relative bg-[#1e293b] border border-gray-800" onclick="openDetails('${game.Id}')" data-name="${game.Nome}">
                        <div class="absolute inset-0 flex items-center justify-center p-4 text-center z-0 opacity-30">
                            <span class="text-white font-bold uppercase text-[8px] tracking-tighter">${game.Nome}</span>
                        </div>
                        <img class="w-full h-full object-cover relative z-10 opacity-0 transition-opacity duration-500" loading="lazy">
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(section);
    });

    // Inicia a busca das imagens para os itens visíveis
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target.querySelector('img');
                const name = entry.target.getAttribute('data-name');
                fetchSteamDataByName(name, img, 'cover');
                observer.unobserve(entry.target);
            }
        });
    }, { rootMargin: '100px' });

    document.querySelectorAll('.game-card').forEach(card => observer.observe(card));
}

async function openDetails(gameId) {
    const game = gamesData.find(g => g.Id === gameId);
    if (!game) return;

    const modal = document.getElementById('gameModal');
    const content = document.getElementById('modalContent');
    const pcWiki = `https://www.pcgamingwiki.com/wiki/${game.Nome.replace(/ /g, '_')}#System_requirements`;

    // Reset modal com loading
    content.innerHTML = `<div class="h-96 flex items-center justify-center text-blue-500 animate-pulse">CARREGANDO...</div>`;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Busca o banner pelo nome antes de renderizar
    let bannerUrl = "";
    const cleanName = game.Nome.replace(/[^a-zA-Z0-9 ]/g, '');
    
    try {
        const searchUrl = `https://corsproxy.io/?${encodeURIComponent('https://store.steampowered.com/api/storesearch/?term=' + cleanName)}`;
        const res = await fetch(searchUrl);
        const data = await res.json();
        if (data.items && data.items[0]) {
            bannerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${data.items[0].id}/library_hero.jpg`;
        }
    } catch (e) {}

    content.innerHTML = `
        <div class="relative h-96 bg-[#0b0e14]">
            <img src="${bannerUrl}" class="w-full h-full object-cover opacity-50">
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
                <div class="flex justify-between border-t border-white/10 pt-4 mt-4 text-center">
                    <div><p class="text-[10px] text-gray-500 font-bold">CRÍTICA</p><p class="text-2xl font-black text-green-400">${game['Avaliação da crítica'] || '--'}</p></div>
                    <div><p class="text-[10px] text-gray-500 font-bold">USER</p><p class="text-2xl font-black text-blue-400">${game['Avaliação da comunidade'] || '--'}</p></div>
                </div>
            </div>
            <div class="md:col-span-2 space-y-6">
                <h3 class="text-blue-500 font-black text-xs uppercase tracking-widest">Descrição</h3>
                <p class="text-gray-300 leading-relaxed text-lg">${game.Descrição || 'Sem descrição.'}</p>
                <div class="flex flex-wrap gap-4 mt-6">
                    <a href="${pcWiki}" target="_blank" class="btn-icon bg-blue-900/40" title="Requisitos"><i class="fas fa-microchip"></i></a>
                    <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(game.Nome)}+trailer" target="_blank" class="btn-icon bg-[#FF0000]" title="YouTube"><i class="fab fa-youtube"></i></a>
                    <a href="https://store.steampowered.com/search/?term=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#171a21]" title="Steam Store"><i class="fab fa-steam"></i></a>
                </div>
            </div>
        </div>
    `;
}

function closeModal() {
    document.getElementById('gameModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}