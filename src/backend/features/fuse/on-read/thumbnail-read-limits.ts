/**
 * Above this size, block-rounding a thumbnail read stops paying off: the thumbnailer
 * reads a small prefix at offset 0 and closes, so rounding up to a full 4MB block
 * downloads far more than it serves. Below it, the whole file fits in one block and
 * caching it is cheap.
 */
export const THUMBNAIL_WHOLE_FILE_LIMIT = 1024 * 1024;
