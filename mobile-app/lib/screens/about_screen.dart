import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:package_info_plus/package_info_plus.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 32),

          // App Icon
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: colorScheme.primaryContainer,
              shape: BoxShape.circle,
            ),
            child: Image.asset(
              'assets/icon_128.png',
              height: 64,
              width: 64,
            ),
          ),

          const SizedBox(height: 24),

          // App Name
          Text(
            'Lipi Lekhika',
            style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),

          const SizedBox(height: 8),

          Text(
            'Script Transliteration and Typing Tool',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
          ),

          const SizedBox(height: 8),

          FutureBuilder<PackageInfo>(
            future: PackageInfo.fromPlatform(),
            builder: (context, snapshot) {
              final version = snapshot.hasData
                  ? 'Version ${snapshot.data!.version}'
                  : 'Version -';
              return Text(
                version,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
              );
            },
          ),

          const SizedBox(height: 32),

          // Description Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        LucideIcons.info,
                        color: colorScheme.primary,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'About',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Lipi Lekhika is a powerful transliteration tool that allows you to convert text between various Indian Brahmic scripts and languages.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          height: 1.6,
                        ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Type Indian Languages with full Speed and Accuracy ',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          height: 1.6,
                        ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Features Card
          // Card(
          //   child: Padding(
          //     padding: const EdgeInsets.all(20),
          //     child: Column(
          //       crossAxisAlignment: CrossAxisAlignment.start,
          //       children: [
          //         Row(
          //           children: [
          //             Icon(
          //               LucideIcons.sparkles,
          //               color: colorScheme.primary,
          //               size: 20,
          //             ),
          //             const SizedBox(width: 8),
          //             Text(
          //               'Features',
          //               style:
          //                   Theme.of(context).textTheme.titleMedium?.copyWith(
          //                         fontWeight: FontWeight.bold,
          //                       ),
          //             ),
          //           ],
          //         ),
          //         const SizedBox(height: 12),
          //         _buildFeatureItem(
          //           context,
          //           LucideIcons.arrowLeftRight,
          //           'Bidirectional transliteration',
          //         ),
          //         _buildFeatureItem(
          //           context,
          //           LucideIcons.zap,
          //           'Real-time conversion',
          //         ),
          //         _buildFeatureItem(
          //           context,
          //           LucideIcons.settings2,
          //           'Customizable options',
          //         ),
          //         _buildFeatureItem(
          //           context,
          //           LucideIcons.keyboard,
          //           'Typing map reference',
          //         ),
          //         _buildFeatureItem(
          //           context,
          //           LucideIcons.moon,
          //           'Dark mode support',
          //         ),
          //       ],
          //     ),
          //   ),
          // ),

          const SizedBox(height: 16),

          // Links Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        LucideIcons.link,
                        color: colorScheme.primary,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Links',
                        style:
                            Theme.of(context).textTheme.titleMedium?.copyWith(
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ListTile(
                    leading: const Icon(LucideIcons.globe),
                    title: const Text('Website'),
                    subtitle: const Text('lipilekhika.in'),
                    contentPadding: EdgeInsets.zero,
                    onTap: () async {
                      const url = 'https://lipilekhika.in';
                      if (await canLaunchUrl(Uri.parse(url))) {
                        await launchUrl(Uri.parse(url),
                            mode: LaunchMode.externalApplication);
                      }
                    },
                  ),
                  ListTile(
                    leading: const Icon(LucideIcons.github),
                    title: const Text('GitHub'),
                    subtitle: const Text('shubhattin/lipilekhika'),
                    contentPadding: EdgeInsets.zero,
                    onTap: () async {
                      const url = 'https://github.com/shubhattin/lipilekhika';
                      if (await canLaunchUrl(Uri.parse(url))) {
                        await launchUrl(Uri.parse(url),
                            mode: LaunchMode.externalApplication);
                      }
                    },
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 32),

          Text(
            '© 2026 Shubham Anand Gupta',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
