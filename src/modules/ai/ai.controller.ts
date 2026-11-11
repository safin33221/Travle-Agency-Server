import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service.js';
import { GenerateAiDraftDto } from './dto/generate-ai-draft.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('drafts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate grounded AI response draft for a customer lead (Staff review required)',
  })
  @ApiResponse({ status: 200, description: 'AI suggestion draft generated' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async generateDraft(
    @Body() dto: GenerateAiDraftDto,
    @CurrentUser('id') authorStaffId: string,
  ) {
    return this.aiService.generateDraft(dto, authorStaffId);
  }
}
