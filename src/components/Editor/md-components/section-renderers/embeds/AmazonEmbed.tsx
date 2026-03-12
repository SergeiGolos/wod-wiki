/**
 * AmazonEmbed
 * 
 * Renders an Amazon product link as a styled card with product details
 * like price, description, and image.
 */

import React from 'react';
import { SECTION_LINE_HEIGHT } from '../../SectionContainer';
import { ExternalLink, ShoppingCart, Tag } from 'lucide-react';

export interface AmazonEmbedProps {
  properties: Record<string, string>;
  lineCount: number;
}

export const AmazonEmbed: React.FC<AmazonEmbedProps> = ({ properties, lineCount }) => {
  const url = properties['url'] || properties['link'] || '';
  const title = properties['title'] || 'Amazon Product';
  const description = properties['description'] || '';
  const image = properties['image'] || properties['img'] || '';
  const price = properties['price'] || '';
  const salePrice = properties['sale_price'] || properties['sale'] || '';
  const isSale = !!salePrice;

  const minHeight = lineCount * SECTION_LINE_HEIGHT;

  if (!url) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground italic bg-muted/30 rounded"
        style={{ minHeight }}
      >
        No Amazon product URL provided
      </div>
    );
  }

  return (
    <div className="py-2" style={{ minHeight }}>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="block group no-underline transition-all duration-200"
      >
        <div className="rounded-lg border border-border/60 bg-card overflow-hidden group-hover:border-orange-500/50 group-hover:shadow-md transition-all flex flex-col sm:flex-row">
          {/* Product Image */}
          {image && (
            <div className="w-full sm:w-48 h-48 sm:h-auto bg-white flex items-center justify-center p-4 border-b sm:border-b-0 sm:border-r border-border/20 shrink-0 overflow-hidden">
              <img 
                src={image} 
                alt={title} 
                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}

          {/* Product Info */}
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-bold text-foreground group-hover:text-orange-600 transition-colors line-clamp-2 leading-tight">
                  {title}
                </h3>
                <div className="bg-[#FF9900]/10 p-1.5 rounded-full shrink-0">
                  <ShoppingCart className="w-4 h-4 text-[#FF9900]" />
                </div>
              </div>

              {description && (
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            <div className="flex items-end justify-between mt-auto">
              <div className="flex flex-col">
                {isSale ? (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-red-600">{salePrice}</span>
                      <span className="text-xs text-muted-foreground line-through opacity-70">{price}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 uppercase tracking-tight">
                      <Tag className="w-3 h-3" />
                      Limited Time Deal
                    </div>
                  </div>
                ) : (
                  price && <span className="text-lg font-bold text-foreground">{price}</span>
                )}
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-orange-600 group-hover:translate-x-0.5 transition-transform">
                Buy on Amazon
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </a>
    </div>
  );
};
