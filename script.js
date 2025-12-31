document.addEventListener('DOMContentLoaded', () => {
    renderLibrary();
    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderLibrary(e.target.value);
    });
});

function renderLibrary(filter = "") {
    const container = document.getElementById('libraryContainer');
    container.innerHTML = '';

    // Ordem exata que você solicitou
    const storeOrder = [
        "Steam", "Steam Family Sharing", "Epic Games", "EA App", 
        "Ubisoft Connect", "GOG", "Battle.net", "Amazon Games", "RobotCache"
    ];

    const grouped = gamesData.reduce((acc, game) => {
        const store = game.Fontes || "Outros";
        if (!acc[store]) acc[store] = [];
        acc[store].push(game);
        return acc;
    }, {});

    // Ordenar conforme a lista definida, e colocar o que sobrar no final
    const sortedStores = Object.keys(grouped).sort((a, b) => {
        let indexA = storeOrder.indexOf(a);
        let indexB = storeOrder.indexOf(b);
        if (indexA === -1) indexA = 99;
        if (indexB === -1) indexB = 99;
        return indexA - indexB;
    });

    sortedStores.forEach(store => {
        const gamesInStore = grouped[store].filter(g => g.Nome.toLowerCase().includes(filter.toLowerCase()));
        if (gamesInStore.length === 0) return;

        const section = document.createElement('div');
        section.className = 'mb-8';
        section.innerHTML = `
            <button class="w-full flex justify-between p-4 bg-gray-900 rounded-xl mb-4 border border-gray-800 font-bold uppercase tracking-tighter hover:bg-gray-800 transition" 
                    onclick="this.nextElementSibling.classList.toggle('hidden')">
                <span><i class="fas fa-database mr-2 text-blue-500"></i> ${store} <span class="text-blue-500 ml-2">${gamesInStore.length}</span></span>
                <i class="fas fa-chevron-down text-xs"></i>
            </button>
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-6 p-2">
                ${gamesInStore.map(game => `
                    <div class="cursor-pointer hover:scale-105 transition transform rounded-lg overflow-hidden bg-gray-800 shadow-lg aspect-[2/3]" 
                         onclick="openDetails('${game.Id}')">
                        <img src="${game.Capa || game.capa || ''}" 
                             class="w-full h-full object-cover" 
                             onerror="this.src='https://via.placeholder.com/600x900?text=Sem+Capa'"
                             alt="${game.Nome}" loading="lazy">
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(section);
    });
}

function openDetails(gameId) {
    const game = gamesData.find(g => g.Id === gameId);
    if (!game) return;

    const modal = document.getElementById('gameModal');
    const content = document.getElementById('modalContent');
    const pcWikiLink = `https://www.pcgamingwiki.com/wiki/${game.Nome.replace(/ /g, '_')}#System_requirements`;

    // Pegando as imagens de forma segura
    const imgCapa = game.Capa || game.capa || '';
    const imgFundo = game['Imagem de Fundo'] || game.imagem_de_fundo || '';

    content.innerHTML = `
        <div class="relative h-96">
            <img src="${imgFundo}" class="w-full h-full object-cover opacity-40">
            <div class="absolute inset-0 bg-gradient-to-t from-[#151921] via-transparent"></div>
            <div class="absolute bottom-0 p-10">
                <h2 class="text-6xl font-black uppercase italic tracking-tighter">${game.Nome}</h2>
                <p class="text-blue-500 font-bold mt-2 tracking-widest uppercase text-sm">${game.Fontes}</p>
            </div>
        </div>

        <div class="p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
            <div class="space-y-6 text-sm bg-black/30 p-8 rounded-3xl border border-gray-700">
                <p><span class="text-gray-500 uppercase text-[10px] font-bold">Desenvolvedor</span><br><strong>${game.Desenvolvedores || 'N/A'}</strong></p>
                <p><span class="text-gray-500 uppercase text-[10px] font-bold">Data de Lançamento</span><br><strong>${game['Data de lançamento'] || 'N/A'}</strong></p>
                <p><span class="text-gray-500 uppercase text-[10px] font-bold">Gêneros</span><br><strong>${game.Gêneros || 'N/A'}</strong></p>
                <p><span class="text-gray-500 uppercase text-[10px] font-bold">Classificação</span><br><strong>${game['Classificação indicativa'] || 'N/A'}</strong></p>
                
                <hr class="border-gray-800">
                
                <div class="flex justify-between">
                    <div>
                        <p class="text-[10px] text-gray-500 uppercase font-bold">Crítica</p>
                        <p class="text-2xl font-black text-green-400">${game['Avaliação da crítica'] || '--'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] text-gray-500 uppercase font-bold">Comunidade</p>
                        <p class="text-2xl font-black text-blue-400">${game['Avaliação da comunidade'] || '--'}</p>
                    </div>
                </div>
            </div>

            <div class="md:col-span-2 space-y-8">
                <div>
                    <h3 class="text-blue-500 font-black text-xs uppercase tracking-[0.2em] mb-4">Descrição</h3>
                    <p class="text-gray-300 leading-relaxed text-base">${game.Descrição || 'Nenhuma descrição disponível.'}</p>
                </div>

                <div class="bg-blue-900/10 p-6 rounded-2xl border border-blue-500/20">
                    <a href="${pcWikiLink}" target="_blank" class="flex items-center text-blue-400 font-bold uppercase text-xs hover:text-blue-300 transition">
                        <i class="fas fa-microchip mr-3 text-lg"></i> Requerimentos do Sistema
                    </a>
                </div>

                <div class="flex flex-wrap gap-4 pt-4">
                    <a title="YouTube Trailer" href="https://www.youtube.com/results?search_query=${encodeURIComponent(game.Nome)}+launch+trailer" target="_blank" class="btn-icon bg-[#FF0000]"><i class="fab fa-youtube text-xl"></i></a>
                    <a title="Steam Store" href="https://store.steampowered.com/search/?term=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#171a21]"><i class="fab fa-steam text-xl"></i></a>
                    <a title="SteamDB" href="https://steamdb.info/app/${game['Id do jogo']}/" target="_blank" class="btn-icon bg-[#1b2838]"><i class="fas fa-chart-line text-xl"></i></a>
                    <a title="ProtonDB" href="https://www.protondb.com/app/${game['Id do jogo']}" target="_blank" class="btn-icon bg-[#212121]"><i class="fab fa-linux text-xl"></i></a>
                    <a title="Co-optimus" href="https://www.co-optimus.com/search.php?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#005596]"><i class="fas fa-users text-xl"></i></a>
                    <a title="HowLongToBeat" href="https://howlongtobeat.com/?q=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#212121]"><i class="fas fa-clock text-xl"></i></a>
                    <a title="Nexus Mods" href="https://www.nexusmods.com/search/?gsearch=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#da8100]"><i class="fas fa-puzzle-piece text-xl"></i></a>
                    <a title="GG Deals" href="https://gg.deals/games/?title=${encodeURIComponent(game.Nome)}" target="_blank" class="btn-icon bg-[#004a00]"><i class="fas fa-tag text-xl"></i></a>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('gameModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}