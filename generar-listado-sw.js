const fs = require('fs/promises');
const path = require('path');

// Configuración de rutas
const PUBLIC_DIR = 'public';
const OUTPUT_FILE = 'lista_archivos_sw.txt';

// Restricciones basadas en tus instrucciones (Paso 4)
const EXCLUDED_DIRS = ['.vscode'];
const EXCLUDED_FILES = [
    '.firebaserc',
    '.gitignore',
    '.htaccess',
    '404.html',
    'sw.js',
    'lista_archivos_sw.txt',
    'generar-listado-sw.js',
    'firebase.json',
    'jsconfig.json',
    'LICENSE',
    'README.md',
];
const EXCLUDED_EXTENSIONS = ['.php', '.db'];

/**
 * Función recursiva para obtener todos los archivos de un directorio
 * @param {import("node:fs").PathLike} dir
 */
async function getFiles(dir) {
    /**
     * @type {any[]}
     */
    let results = [];
    const list = await fs.readdir(dir, { withFileTypes: true });

    for (const dirent of list) {
        const fullPath = path.join(dir, dirent.name);

        if (dirent.isDirectory()) {
            // Ignorar carpetas excluidas como .vscode
            if (!EXCLUDED_DIRS.includes(dirent.name)) {
                results = results.concat(await getFiles(fullPath));
            }
        } else {
            const fileName = dirent.name;
            const ext = path.extname(fileName).toLowerCase();

            // Filtrar archivos específicos y extensiones (.php, .db)
            if (!EXCLUDED_FILES.includes(fileName) && !EXCLUDED_EXTENSIONS.includes(ext)) {

                // Obtener ruta relativa respecto a la carpeta 'public'
                let relativePath = path.relative(PUBLIC_DIR, fullPath);

                // Convertir barras invertidas de Windows (\) a barras normales (/) (Paso 5 y 8)
                relativePath = relativePath.split(path.sep).join('/');

                // Guardar la ruta con el formato adecuado
                results.push(`"${relativePath}"`);
            }
        }
    }
    return results;
}

/**
 * Función principal para generar el archivo
 */
async function generateSWList() {
    try {
        console.log(`Explorando la carpeta "${PUBLIC_DIR}"...`);
        const files = await getFiles(PUBLIC_DIR);

        // Mantener el último elemento requerido por el Service Worker (Paso 10)
        files.push('"/"');

        // Dar formato de arreglo de JavaScript con saltos de línea y sangría (Paso 6 y 9)
        const arrayContent = `const ARCHIVOS = [\n  ${files.join(',\n  ')}\n]`;

        // Escribir el resultado en un archivo de texto
        await fs.writeFile(OUTPUT_FILE, arrayContent, 'utf-8');

        console.log(`¡Éxito! El listado se ha generado correctamente.`);
        console.log(`Revisa el archivo "${OUTPUT_FILE}" y copia el contenido a tu public/sw.js.`);

    } catch (error) {
        console.error('Error al generar el listado:', error.message);
    }
}

generateSWList();