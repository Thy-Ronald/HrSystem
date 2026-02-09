import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    IconButton,
    Skeleton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

// Move regex outside to avoid initialization churn
const COMBINED_MEDIA_REGEX = /(!\[(.*?)\]\((.*?)\))|(<img\b[^>]*?>)|(https?:\/\/github\.com\/user-attachments\/assets\/[^\s"<>]+)|(https?:\/\/[^\s"<>]+?\.(?:jpg|jpeg|png|gif|webp|svg|mp4|mov|webm|ogg)(?:\?[^\s"<>]+)?)/gi;

/**
 * MediaDisplay component to handle both images and videos
 * Automatically tries to render as a video if image loading fails
 */
const MediaDisplay = ({ url, proxiedUrl, alt }) => {
    const [mode, setMode] = React.useState(null); // 'image', 'video', 'error'
    const [isLoading, setIsLoading] = React.useState(true);

    // Initial determination based on extension
    React.useEffect(() => {
        const isVideo = url.match(/\.(mp4|mov|webm|ogg)(\?.*)?$/i);
        setMode(isVideo ? 'video' : 'image');
        setIsLoading(true);
    }, [url]);

    const handleLoad = () => setIsLoading(false);
    const handleError = () => {
        if (mode === 'image') {
            console.log('[MediaDisplay] Image failed, trying video:', url);
            setMode('video');
            setIsLoading(true); // Reset loading state for video attempt
        } else {
            console.log('[MediaDisplay] Video failed:', url);
            setMode('error');
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ mb: 2, textAlign: 'center', position: 'relative', minHeight: isLoading ? 200 : 'auto' }}>
            {isLoading && (
                <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={300}
                    sx={{ borderRadius: 1 }}
                    animation="wave"
                />
            )}

            {mode === 'image' && (
                <img
                    src={proxiedUrl}
                    alt={alt}
                    referrerPolicy="no-referrer"
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '500px',
                        borderRadius: '4px',
                        border: '1px solid #e0e0e0',
                        display: isLoading ? 'none' : 'block',
                        margin: '0 auto'
                    }}
                />
            )}

            {mode === 'video' && (
                <Box sx={{ display: isLoading ? 'none' : 'block' }}>
                    <video
                        src={proxiedUrl}
                        controls
                        playsInline
                        onLoadedData={handleLoad}
                        onError={handleError}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '500px',
                            borderRadius: '4px',
                            border: '1px solid #e0e0e0',
                            backgroundColor: '#000'
                        }}
                    >
                        Your browser does not support the video tag.
                    </video>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#666' }}>
                        📹 Video Evidence
                    </Typography>
                </Box>
            )}

            {mode === 'error' && (
                <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1, bgcolor: '#fafafa' }}>
                    <Typography variant="caption" color="error.main" sx={{ display: 'block', mb: 1 }}>
                        Failed to load content.
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        href={proxiedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ fontSize: '0.65rem', textTransform: 'none' }}
                    >
                        Open in new tab
                    </Button>
                </Box>
            )}
        </Box>
    );
};

const EvidenceModal = ({ open, onClose, evidence, issueTitle }) => {
    // Function to parse evidence and extract images/videos
    const parseEvidence = React.useCallback((text) => {
        if (!text || typeof text !== 'string') return [text];
        const elements = [];
        let key = 0;

        let lastIndex = 0;
        let match;

        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

        // Use the external regex but reset its index
        COMBINED_MEDIA_REGEX.lastIndex = 0;

        while ((match = COMBINED_MEDIA_REGEX.exec(text)) !== null) {
            // Add text before match
            if (match.index > lastIndex) {
                const textBefore = text.substring(lastIndex, match.index);
                if (textBefore.trim()) {
                    elements.push(
                        <Typography key={key++} variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                            {textBefore}
                        </Typography>
                    );
                }
            }

            let url = '';
            let alt = 'Evidence material';

            if (match[1]) { // Markdown
                alt = match[2] || alt;
                url = match[3];
            } else if (match[4]) { // HTML <img>
                const tag = match[4];
                const srcMatch = /src\s*=\s*["']([^"']+)["']/i.exec(tag);
                const altMatch = /alt\s*=\s*["']([^"']+)["']/i.exec(tag);
                url = srcMatch ? srcMatch[1] : '';
                alt = altMatch ? altMatch[1] : alt;
            } else if (match[5] || match[6]) { // URL directly
                url = match[5] || match[6];
            }

            if (url) {
                const isGithubUrl = url.includes('github.com') || url.includes('githubusercontent.com');

                // Use proxy for all GitHub assets to ensure authorization
                const proxiedUrl = isGithubUrl
                    ? `${API_BASE}/api/github/proxy-image?url=${encodeURIComponent(url)}`
                    : url;

                elements.push(
                    <MediaDisplay
                        key={key++}
                        url={url}
                        proxiedUrl={proxiedUrl}
                        alt={alt}
                    />
                );
            }

            lastIndex = COMBINED_MEDIA_REGEX.lastIndex;
        }

        // Add remaining text
        if (lastIndex < text.length) {
            const remaining = text.substring(lastIndex);
            if (remaining.trim()) {
                elements.push(
                    <Typography key={key++} variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                        {remaining}
                    </Typography>
                );
            }
        }

        return elements;
    }, []);

    const parsedContent = React.useMemo(() => {
        if (!evidence) return null;
        return parseEvidence(evidence);
    }, [evidence, parseEvidence]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    height: '92vh',
                    maxHeight: '92vh'
                }
            }}
        >
            <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e0e0e0',
                pb: 1
            }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                    Evidence
                </Typography>
                <IconButton
                    edge="end"
                    color="inherit"
                    onClick={onClose}
                    aria-label="close"
                    size="small"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ mt: 2 }}>
                {issueTitle && (
                    <Typography variant="subtitle2" sx={{ mb: 2, color: '#666', fontStyle: 'italic' }}>
                        Issue: {issueTitle}
                    </Typography>
                )}
                {!evidence || evidence.trim() === '' ? (
                    <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        py: 6,
                        textAlign: 'center'
                    }}>
                        <Box sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2
                        }}>
                            <Typography variant="h3" sx={{ color: '#ccc' }}>📄</Typography>
                        </Box>
                        <Typography variant="h6" sx={{ color: '#666', mb: 1, fontWeight: 500 }}>
                            No Evidence Available
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#999', maxWidth: 400 }}>
                            No evidence has been added to this issue yet. Add evidence by including "[ EVIDENCE ]" in a comment.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ '& > *:last-child': { mb: 0 } }}>
                        {parsedContent}
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ borderTop: '1px solid #e0e0e0', px: 3, py: 2 }}>
                <Button onClick={onClose} variant="contained" color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EvidenceModal;
